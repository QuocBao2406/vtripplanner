export type TripTransportMode =
  | "MOTORBIKE"
  | "CAR"
  | "COACH";

export type TripTravelEstimateSource =
  | "GOOGLE_ROUTES"
  | "INTERNAL_FALLBACK";

export type TripTravelEstimateConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type TripTravelGeoPoint = {
  latitude: number;
  longitude: number;
};

export type TripTravelEstimate = {
  origin: string;
  destination: string;
  transportMode: TripTransportMode;
  departureAt: string;
  arrivalAt: string;
  distanceKm: number | null;
  durationMinutes: number;
  source: TripTravelEstimateSource;
  sourceLabel: string;
  confidence: TripTravelEstimateConfidence;
  warning: string | null;
};

type EstimateTripTravelInput = {
  origin: string;
  destination: string;
  transportMode: TripTransportMode;
  departureAt: Date;
  fallbackOrigin?: TripTravelGeoPoint | null;
  fallbackDestination?: TripTravelGeoPoint | null;
};

type GoogleRouteResponse = {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
  }>;
};

const GOOGLE_ROUTES_ENDPOINT =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const GOOGLE_ROUTES_TIMEOUT_MS = 6500;
const VIETNAM_TIME_ZONE_OFFSET = "+07:00";

const KNOWN_VIETNAM_CENTERS: Array<{
  aliases: string[];
  point: TripTravelGeoPoint;
}> = [
  {
    aliases: [
      "tp ho chi minh",
      "thanh pho ho chi minh",
      "ho chi minh",
      "sai gon",
      "hcm",
      "tp hcm",
    ],
    point: {
      latitude: 10.7769,
      longitude: 106.7009,
    },
  },
  {
    aliases: ["da lat", "lam dong"],
    point: {
      latitude: 11.9404,
      longitude: 108.4583,
    },
  },
  {
    aliases: ["ha noi"],
    point: {
      latitude: 21.0278,
      longitude: 105.8342,
    },
  },
  {
    aliases: ["da nang"],
    point: {
      latitude: 16.0544,
      longitude: 108.2022,
    },
  },
  {
    aliases: ["vung tau", "ba ria vung tau"],
    point: {
      latitude: 10.4114,
      longitude: 107.1362,
    },
  },
  {
    aliases: ["phan thiet", "binh thuan"],
    point: {
      latitude: 10.9289,
      longitude: 108.1021,
    },
  },
  {
    aliases: ["nha trang", "khanh hoa"],
    point: {
      latitude: 12.2388,
      longitude: 109.1967,
    },
  },
  {
    aliases: ["hue", "thua thien hue"],
    point: {
      latitude: 16.4637,
      longitude: 107.5909,
    },
  },
  {
    aliases: ["can tho"],
    point: {
      latitude: 10.0452,
      longitude: 105.7469,
    },
  },
  {
    aliases: ["hai phong"],
    point: {
      latitude: 20.8449,
      longitude: 106.6881,
    },
  },
  {
    aliases: ["quy nhon", "binh dinh"],
    point: {
      latitude: 13.782,
      longitude: 109.219,
    },
  },
  {
    aliases: ["buon ma thuot", "dak lak", "dac lac"],
    point: {
      latitude: 12.6667,
      longitude: 108.05,
    },
  },
  {
    aliases: ["hoi an", "quang nam"],
    point: {
      latitude: 15.8801,
      longitude: 108.338,
    },
  },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isFinitePoint(
  value: TripTravelGeoPoint | null | undefined,
): value is TripTravelGeoPoint {
  return Boolean(
    value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude),
  );
}

function getKnownCenter(
  value: string,
): TripTravelGeoPoint | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  for (const item of KNOWN_VIETNAM_CENTERS) {
    if (
      item.aliases.some(
        (alias) =>
          normalized === alias ||
          normalized.includes(alias) ||
          alias.includes(normalized),
      )
    ) {
      return item.point;
    }
  }

  return null;
}

function resolveFallbackPoint(
  label: string,
  databasePoint: TripTravelGeoPoint | null | undefined,
): TripTravelGeoPoint | null {
  if (isFinitePoint(databasePoint)) {
    return databasePoint;
  }

  return getKnownCenter(label);
}

function haversineDistanceKm(
  left: TripTravelGeoPoint,
  right: TripTravelGeoPoint,
): number {
  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(
    right.latitude - left.latitude,
  );
  const longitudeDelta = toRadians(
    right.longitude - left.longitude,
  );
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function parseGoogleDurationMinutes(
  value: string | undefined,
): number | null {
  if (!value) {
    return null;
  }

  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(value);

  if (!match) {
    return null;
  }

  const seconds = Number(match[1]);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.max(1, Math.ceil(seconds / 60));
}

function getGoogleTravelMode(
  mode: TripTransportMode,
): "DRIVE" | "TWO_WHEELER" {
  return mode === "MOTORBIKE" ? "TWO_WHEELER" : "DRIVE";
}

function getGoogleWarning(
  mode: TripTransportMode,
): string | null {
  if (mode === "MOTORBIKE") {
    return "Google Routes TWO_WHEELER đang ở trạng thái beta; ETA xe máy chỉ nên xem là ước tính tham khảo.";
  }

  if (mode === "COACH") {
    return "Xe khách dùng thời gian đường bộ Google Routes làm nền rồi cộng buffer dừng/nghỉ; đây chưa phải lịch chạy của một nhà xe cụ thể.";
  }

  return null;
}

function getGoogleConfidence(
  mode: TripTransportMode,
): TripTravelEstimateConfidence {
  return mode === "CAR" ? "HIGH" : "MEDIUM";
}

async function estimateWithGoogleRoutes(
  input: EstimateTripTravelInput,
  apiKey: string,
): Promise<TripTravelEstimate | null> {
  const googleMode = getGoogleTravelMode(
    input.transportMode,
  );

  const body: Record<string, unknown> = {
    origin: {
      address: `${input.origin}, Việt Nam`,
    },
    destination: {
      address: `${input.destination}, Việt Nam`,
    },
    travelMode: googleMode,
    computeAlternativeRoutes: false,
    languageCode: "vi",
    units: "METRIC",
  };

  if (
    input.departureAt.getTime() >
    Date.now() + 60 * 1000
  ) {
    body.routingPreference = "TRAFFIC_AWARE";
    body.departureTime = input.departureAt.toISOString();
  } else {
    body.routingPreference = "TRAFFIC_UNAWARE";
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GOOGLE_ROUTES_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      GOOGLE_ROUTES_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.warn(
        "Google Routes estimate failed with status:",
        response.status,
      );
      return null;
    }

    const payload =
      (await response.json()) as GoogleRouteResponse;
    const route = payload.routes?.[0];
    const baseDurationMinutes =
      parseGoogleDurationMinutes(route?.duration);

    if (!route || baseDurationMinutes === null) {
      return null;
    }

    const durationMinutes =
      input.transportMode === "COACH"
        ? Math.ceil(
            baseDurationMinutes * 1.12 + 30,
          )
        : baseDurationMinutes;

    const distanceKm =
      typeof route.distanceMeters === "number" &&
      Number.isFinite(route.distanceMeters)
        ? Math.round(
            (route.distanceMeters / 1000) * 10,
          ) / 10
        : null;

    const arrivalAt = new Date(
      input.departureAt.getTime() +
        durationMinutes * 60 * 1000,
    );

    return {
      origin: input.origin,
      destination: input.destination,
      transportMode: input.transportMode,
      departureAt: input.departureAt.toISOString(),
      arrivalAt: arrivalAt.toISOString(),
      distanceKm,
      durationMinutes,
      source: "GOOGLE_ROUTES",
      sourceLabel:
        input.transportMode === "COACH"
          ? "Google Routes + buffer xe khách"
          : "Google Routes",
      confidence: getGoogleConfidence(
        input.transportMode,
      ),
      warning: getGoogleWarning(
        input.transportMode,
      ),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name !== "AbortError"
    ) {
      console.warn(
        "Google Routes estimate unavailable:",
        error.message,
      );
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function estimateWithInternalFallback(
  input: EstimateTripTravelInput,
): TripTravelEstimate | null {
  const originPoint = resolveFallbackPoint(
    input.origin,
    input.fallbackOrigin,
  );
  const destinationPoint = resolveFallbackPoint(
    input.destination,
    input.fallbackDestination,
  );

  if (!originPoint || !destinationPoint) {
    return null;
  }

  const straightDistanceKm = haversineDistanceKm(
    originPoint,
    destinationPoint,
  );
  const roadDistanceKm = Math.max(
    5,
    straightDistanceKm * 1.25,
  );

  const speedKmPerHour =
    input.transportMode === "MOTORBIKE"
      ? 42
      : input.transportMode === "CAR"
        ? 55
        : 48;
  const fixedBufferMinutes =
    input.transportMode === "COACH" ? 45 : 15;

  const durationMinutes = Math.max(
    20,
    Math.ceil(
      (roadDistanceKm / speedKmPerHour) * 60 +
        fixedBufferMinutes,
    ),
  );
  const arrivalAt = new Date(
    input.departureAt.getTime() +
      durationMinutes * 60 * 1000,
  );

  return {
    origin: input.origin,
    destination: input.destination,
    transportMode: input.transportMode,
    departureAt: input.departureAt.toISOString(),
    arrivalAt: arrivalAt.toISOString(),
    distanceKm:
      Math.round(roadDistanceKm * 10) / 10,
    durationMinutes,
    source: "INTERNAL_FALLBACK",
    sourceLabel: "Ước tính nội bộ VTripPlanner",
    confidence: "LOW",
    warning:
      "Không lấy được Google Routes hoặc chưa cấu hình API key; thời gian được ước tính từ khoảng cách và tốc độ trung bình, không phản ánh giao thông thực tế.",
  };
}

export function isTripTransportMode(
  value: string,
): value is TripTransportMode {
  return (
    value === "MOTORBIKE" ||
    value === "CAR" ||
    value === "COACH"
  );
}

export function parseVietnamTripDeparture(
  startDate: string,
  departureTime: string,
): Date | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
      departureTime,
    )
  ) {
    return null;
  }

  const value = new Date(
    `${startDate}T${departureTime}:00${VIETNAM_TIME_ZONE_OFFSET}`,
  );

  return Number.isNaN(value.getTime()) ? null : value;
}

export async function estimateTripTravel(
  input: EstimateTripTravelInput,
): Promise<TripTravelEstimate | null> {
  const apiKey =
    process.env.GOOGLE_MAPS_ROUTES_API_KEY?.trim();

  if (apiKey) {
    const googleEstimate =
      await estimateWithGoogleRoutes(input, apiKey);

    if (googleEstimate) {
      return googleEstimate;
    }
  }

  return estimateWithInternalFallback(input);
}
