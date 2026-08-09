import { prisma } from "@/lib/prisma";
import {
  estimateTripTravel,
  parseVietnamTripDeparture,
  type TripTransportMode,
  type TripTravelEstimate,
  type TripTravelGeoPoint,
} from "@/lib/trip-planner/travel-estimate";
import {
  buildTripBudgetEstimate,
  getActivityBudgetScore,
  type TripBudgetEstimate,
} from "@/lib/trip-planner/budget-estimate";
import {
  getReactionInterestSignals,
  type TripReactionInterestSignals,
} from "@/lib/trip-planner/reaction-interest-signals";

const PLACE_IMAGE_BUCKET = "place-images";
const MAX_PLANNER_PLACES = 200;
const MAX_DURATION_DAYS = 7;
const SAVED_PLACE_BOOST_PER_POST = 3;
const MAX_SAVED_PLACE_BOOST = 6;
const ARRIVAL_BUFFER_MINUTES = 60;
const MAX_CUSTOM_DRAFT_ACTIVITIES_PER_DAY = 24;

export type InternalTripPlanRequest = {
  origin: string;
  destination: string;
  startDate: string;
  departureTime: string;
  transportMode: TripTransportMode;
  duration: number;
  travelerCount: number;
  totalBudget: number;
  interests: string[];
};

export type InternalTripPlanActivity = {
  slot: "MORNING" | "AFTERNOON" | "EVENING";
  slotLabel: string;
  time: string;
  placeId: string;
  placeName: string;
  categoryName: string;
  addressLine: string;
  provinceName: string;
  imageUrl: string | null;
  shortDescription: string | null;
  seasonNote: string | null;
  entryPrice: number;
  currency: string;
  score: number;
  reasons: string[];
  openingNote: string;
  distanceFromPreviousKm: number | null;
};

export type InternalTripPlanDay = {
  dayNumber: number;
  date: string;
  dateLabel: string;
  summary: string;
  activities: InternalTripPlanActivity[];
};

export type InternalTripPlan = {
  origin: string;
  destination: string;
  startDate: string;
  departureTime: string;
  transportMode: TripTransportMode;
  travelEstimate: TripTravelEstimate | null;
  travelEstimateMessage: string | null;
  duration: number;
  travelerCount: number;
  totalBudget: number;
  budgetEstimate: TripBudgetEstimate;
  interests: string[];
  generatedAt: string;
  candidateCount: number;
  scheduledPlaceCount: number;
  estimatedEntryFees: number;
  currency: string;
  personalization: {
    applied: boolean;
    reactionCount: number;
    saveCount: number;
    matchedPlaceCount: number;
    matchedSavedPlaceCount: number;
    preferredMonths: number[];
    savedPreferredMonths: number[];
  };
  scoringGuide: string[];
  days: InternalTripPlanDay[];
};

export type InternalTripPlanGenerationResult = {
  plan: InternalTripPlan | null;
  availableDestinations: string[];
};


export type InternalTripDraftPlaceOption = {
  placeId: string;
  placeName: string;
  categoryName: string;
  addressLine: string;
  provinceName: string;
  imageUrl: string | null;
  shortDescription: string | null;
  seasonNote: string | null;
  entryPrice: number;
  currency: string;
  score: number;
  reasons: string[];
};

export type InternalTripDraftDayInput = {
  dayNumber: number;
  date: string;
  activities: Array<{
    placeId: string;
    time: string;
  }>;
};

export class InternalTripDraftValidationError extends Error {
  readonly code: string;

  constructor(
    code: string,
    message: string,
  ) {
    super(message);
    this.name = "InternalTripDraftValidationError";
    this.code = code;
  }
}

type PlannerOpeningPeriod = {
  dayOfWeek: string;
  periodOrder: number;
  openMinutes: number | null;
  closeMinutes: number | null;
  closesNextDay: boolean;
  isClosed: boolean;
  isOpen24Hours: boolean;
  note: string | null;
};

type PlannerPlace = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  addressLine: string;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  bestVisitMonths: number[];
  seasonNote: string | null;
  category: {
    name: string;
    slug: string;
    description: string | null;
  };
  province: {
    name: string;
    slug: string;
  };
  district: {
    name: string;
    slug: string;
  } | null;
  imagePath: string | null;
  entryPrice: number;
  currency: string;
  openingHours: PlannerOpeningPeriod[];
};

type ScoredPlannerPlace = PlannerPlace & {
  score: number;
  reasons: string[];
  reactionScore: number;
  savedPostCount: number;
  savedBoost: number;
};

const SLOT_DEFINITIONS = [
  {
    slot: "MORNING" as const,
    label: "Buổi sáng",
    time: "08:30",
    minutes: 8 * 60 + 30,
    latestMinutes: 11 * 60,
  },
  {
    slot: "AFTERNOON" as const,
    label: "Buổi chiều",
    time: "14:00",
    minutes: 14 * 60,
    latestMinutes: 16 * 60 + 30,
  },
  {
    slot: "EVENING" as const,
    label: "Buổi tối",
    time: "19:00",
    minutes: 19 * 60,
    latestMinutes: 20 * 60 + 30,
  },
];

const DAY_OF_WEEK = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const INTEREST_CATEGORY_RULES: Array<{
  keywords: string[];
  categorySlugs: string[];
}> = [
  {
    keywords: [
      "kham pha canh dep",
      "canh dep",
      "thien nhien",
      "chup anh",
    ],
    categorySlugs: [
      "thien-nhien-va-cong-vien",
      "vui-choi-va-trai-nghiem",
    ],
  },
  {
    keywords: [
      "am thuc",
      "mon an",
      "cho",
    ],
    categorySlugs: ["cho-va-am-thuc"],
  },
  {
    keywords: [
      "van hoa lich su",
      "van hoa",
      "lich su",
      "kien truc",
    ],
    categorySlugs: [
      "lich-su-va-bao-tang",
      "kien-truc-va-van-hoa",
      "tam-linh",
    ],
  },
  {
    keywords: [
      "nghi duong",
      "thu gian",
      "yen tinh",
    ],
    categorySlugs: [
      "thien-nhien-va-cong-vien",
    ],
  },
  {
    keywords: [
      "trai nghiem dia phuong",
      "dia phuong",
      "trai nghiem",
    ],
    categorySlugs: [
      "cho-va-am-thuc",
      "vui-choi-va-trai-nghiem",
      "kien-truc-va-van-hoa",
    ],
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

function getPublicPlaceImageUrl(
  storagePath: string | null,
): string | null {
  if (!storagePath) {
    return null;
  }

  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("/")
  ) {
    return storagePath;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
      /\/+$/,
      "",
    );

  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return (
    `${supabaseUrl}/storage/v1/object/public/` +
    `${PLACE_IMAGE_BUCKET}/${encodedPath}`
  );
}

function prismaTimeToMinutes(
  value: Date | null,
): number | null {
  if (!value) {
    return null;
  }

  return (
    value.getUTCHours() * 60 +
    value.getUTCMinutes()
  );
}

async function loadPlannerPlaces(): Promise<PlannerPlace[]> {
  const places = await prisma.place.findMany({
    where: {
      verificationStatus: "VERIFIED",
      isActive: true,
      deletedAt: null,
      province: {
        isActive: true,
      },
      category: {
        isActive: true,
      },
    },
    orderBy: [
      {
        province: {
          name: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
    take: MAX_PLANNER_PLACES,
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      addressLine: true,
      ward: true,
      latitude: true,
      longitude: true,
      bestVisitMonths: true,
      seasonNote: true,
      category: {
        select: {
          name: true,
          slug: true,
          description: true,
        },
      },
      province: {
        select: {
          name: true,
          slug: true,
        },
      },
      district: {
        select: {
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: [
          {
            isCover: "desc",
          },
          {
            sortOrder: "asc",
          },
        ],
        take: 1,
        select: {
          storagePath: true,
        },
      },
      prices: {
        where: {
          isActive: true,
        },
        orderBy: {
          amount: "asc",
        },
        take: 1,
        select: {
          amount: true,
          currency: true,
        },
      },
      openingHours: {
        orderBy: {
          periodOrder: "asc",
        },
        select: {
          dayOfWeek: true,
          periodOrder: true,
          openTime: true,
          closeTime: true,
          closesNextDay: true,
          isClosed: true,
          isOpen24Hours: true,
          note: true,
        },
      },
    },
  });

  return places.map((place) => ({
    id: place.id,
    name: place.name,
    slug: place.slug,
    shortDescription: place.shortDescription,
    description: place.description,
    addressLine: place.addressLine,
    ward: place.ward,
    latitude:
      place.latitude === null
        ? null
        : Number(place.latitude),
    longitude:
      place.longitude === null
        ? null
        : Number(place.longitude),
    bestVisitMonths: place.bestVisitMonths,
    seasonNote: place.seasonNote,
    category: place.category,
    province: place.province,
    district: place.district,
    imagePath:
      place.images[0]?.storagePath ?? null,
    entryPrice:
      place.prices.length > 0
        ? Number(place.prices[0].amount)
        : 0,
    currency:
      place.prices[0]?.currency ?? "VND",
    openingHours: place.openingHours.map(
      (period) => ({
        dayOfWeek: period.dayOfWeek,
        periodOrder: period.periodOrder,
        openMinutes: prismaTimeToMinutes(
          period.openTime,
        ),
        closeMinutes: prismaTimeToMinutes(
          period.closeTime,
        ),
        closesNextDay: period.closesNextDay,
        isClosed: period.isClosed,
        isOpen24Hours: period.isOpen24Hours,
        note: period.note,
      }),
    ),
  }));
}

function buildDestinationTerms(
  destination: string,
): string[] {
  const normalized = normalizeText(destination);
  const terms = new Set<string>([normalized]);

  if (normalized.includes("da lat")) {
    terms.add("lam dong");
  }

  if (
    normalized.includes("sai gon") ||
    normalized.includes("ho chi minh") ||
    normalized === "hcm" ||
    normalized.includes("tp hcm")
  ) {
    terms.add("thanh pho ho chi minh");
    terms.add("sai gon");
  }

  return [...terms].filter(Boolean);
}

function placeMatchesDestination(
  place: PlannerPlace,
  destinationTerms: string[],
): boolean {
  const haystack = normalizeText(
    [
      place.name,
      place.shortDescription ?? "",
      place.description ?? "",
      place.addressLine,
      place.ward ?? "",
      place.province.name,
      place.province.slug,
      place.district?.name ?? "",
      place.district?.slug ?? "",
    ].join(" "),
  );

  return destinationTerms.some(
    (term) => haystack.includes(term),
  );
}

function getPlaceCenter(
  places: PlannerPlace[],
): TripTravelGeoPoint | null {
  const coordinates = places.filter(
    (place) =>
      place.latitude !== null &&
      place.longitude !== null,
  );

  if (coordinates.length === 0) {
    return null;
  }

  const latitude =
    coordinates.reduce(
      (total, place) =>
        total + (place.latitude ?? 0),
      0,
    ) / coordinates.length;
  const longitude =
    coordinates.reduce(
      (total, place) =>
        total + (place.longitude ?? 0),
      0,
    ) / coordinates.length;

  return {
    latitude,
    longitude,
  };
}

function getInterestMatchedLabels(
  categorySlug: string,
  interests: string[],
): string[] {
  const matchedLabels: string[] = [];

  for (const interest of interests) {
    const normalizedInterest = normalizeText(interest);

    const matchedRule =
      INTEREST_CATEGORY_RULES.find((rule) =>
        rule.keywords.some(
          (keyword) =>
            normalizedInterest.includes(keyword) ||
            keyword.includes(normalizedInterest),
        ),
      );

    if (
      matchedRule?.categorySlugs.includes(
        categorySlug,
      )
    ) {
      matchedLabels.push(interest);
    }
  }

  return matchedLabels;
}

function scorePlaces(
  places: PlannerPlace[],
  request: InternalTripPlanRequest,
  reactionSignals: TripReactionInterestSignals | null,
  visitMonth: number,
): ScoredPlannerPlace[] {
  const reactionScoreByPlaceId = new Map(
    reactionSignals?.topPlaces.map(
      (signal) => [
        signal.placeId,
        signal.score,
      ],
    ) ?? [],
  );

  const savedPostCountByPlaceId = new Map(
    reactionSignals?.topSavedPlaces.map(
      (signal) => [
        signal.placeId,
        signal.saveCount,
      ],
    ) ?? [],
  );

  return places
    .map((place) => {
      let score = 10;
      const reasons: string[] = [];

      const interestLabels =
        getInterestMatchedLabels(
          place.category.slug,
          request.interests,
        );

      if (interestLabels.length > 0) {
        score += interestLabels.length * 4;
        reasons.push(
          `Phù hợp sở thích: ${interestLabels.join(", ")}`,
        );
      }

      if (
        place.bestVisitMonths.includes(
          visitMonth,
        )
      ) {
        score += 4;
        reasons.push(
          `Phù hợp mùa đi tháng ${visitMonth}`,
        );
      } else if (
        place.bestVisitMonths.length === 0
      ) {
        score += 1;
        reasons.push(
          "Có thể cân nhắc quanh năm",
        );
      }

      const reactionScore =
        reactionScoreByPlaceId.get(place.id) ?? 0;

      if (reactionScore > 0) {
        score += Math.min(
          9,
          reactionScore * 2,
        );
        reasons.push(
          `Được ưu tiên từ reaction của bạn (+${reactionScore})`,
        );
      }

      const savedPostCount =
        savedPostCountByPlaceId.get(place.id) ?? 0;
      const savedBoost =
        Math.min(
          MAX_SAVED_PLACE_BOOST,
          savedPostCount *
            SAVED_PLACE_BOOST_PER_POST,
        );

      if (savedBoost > 0) {
        score += savedBoost;
        reasons.push(
          `🔖 Bạn đã lưu bài viết liên quan (+${savedBoost})`,
        );
      }

      const budgetResult =
        getActivityBudgetScore(
          place.entryPrice,
          request.totalBudget,
          request.travelerCount,
          request.duration,
        );

      score += budgetResult.score;

      if (budgetResult.reason) {
        reasons.push(budgetResult.reason);
      }

      if (reasons.length === 0) {
        reasons.push(
          "Phù hợp với điểm đến đã chọn",
        );
      }

      return {
        ...place,
        score,
        reasons,
        reactionScore,
        savedPostCount,
        savedBoost,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.savedBoost -
          left.savedBoost ||
        right.reactionScore -
          left.reactionScore ||
        left.entryPrice -
          right.entryPrice ||
        left.name.localeCompare(
          right.name,
          "vi",
        ),
    );
}

function parseCalendarDate(
  value: string,
): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getUTCDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function getOpeningState(
  place: PlannerPlace,
  dayOfWeek: string,
  slotMinutes: number,
): {
  canVisit: boolean;
  note: string;
} {
  const periods = place.openingHours.filter(
    (period) =>
      period.dayOfWeek === dayOfWeek,
  );

  if (periods.length === 0) {
    return {
      canVisit: true,
      note:
        "Chưa có giờ mở cửa cho ngày này; nên kiểm tra lại trước khi đi.",
    };
  }

  if (
    periods.some(
      (period) =>
        period.isOpen24Hours &&
        !period.isClosed,
    )
  ) {
    return {
      canVisit: true,
      note: "Mở cửa cả ngày theo dữ liệu hiện tại.",
    };
  }

  for (const period of periods) {
    if (period.isClosed) {
      continue;
    }

    const open = period.openMinutes;
    const close = period.closeMinutes;

    if (open === null || close === null) {
      return {
        canVisit: true,
        note:
          period.note ??
          "Khung giờ mở cửa chưa đầy đủ; nên kiểm tra lại trước khi đi.",
      };
    }

    const crossesMidnight =
      period.closesNextDay || close < open;

    const isInside = crossesMidnight
      ? slotMinutes >= open ||
        slotMinutes <= close
      : slotMinutes >= open &&
        slotMinutes <= close;

    if (isInside) {
      return {
        canVisit: true,
        note:
          period.note ??
          "Khung giờ này nằm trong giờ mở cửa.",
      };
    }
  }

  return {
    canVisit: false,
    note:
      "Không khớp giờ mở cửa ở khung giờ này.",
  };
}

function haversineDistanceKm(
  left: PlannerPlace,
  right: PlannerPlace,
): number | null {
  if (
    left.latitude === null ||
    left.longitude === null ||
    right.latitude === null ||
    right.longitude === null
  ) {
    return null;
  }

  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(
    right.latitude - left.latitude,
  );
  const longitudeDelta = toRadians(
    right.longitude - left.longitude,
  );

  const leftLatitude = toRadians(
    left.latitude,
  );
  const rightLatitude = toRadians(
    right.latitude,
  );

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const distance =
    2 *
    earthRadiusKm *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return Math.round(distance * 10) / 10;
}

function choosePlaceForSlot(
  candidates: ScoredPlannerPlace[],
  usedPlaceIds: Set<string>,
  dayOfWeek: string,
  slotMinutes: number,
  previousPlace: ScoredPlannerPlace | null,
): {
  place: ScoredPlannerPlace;
  openingNote: string;
  distanceFromPreviousKm: number | null;
} | null {
  const available = candidates
    .filter(
      (place) => !usedPlaceIds.has(place.id),
    )
    .map((place) => {
      const openingState =
        getOpeningState(
          place,
          dayOfWeek,
          slotMinutes,
        );

      if (!openingState.canVisit) {
        return null;
      }

      const distance =
        previousPlace
          ? haversineDistanceKm(
              previousPlace,
              place,
            )
          : null;

      const proximityPenalty =
        distance === null
          ? 0
          : Math.min(distance, 25) * 0.12;

      return {
        place,
        openingNote: openingState.note,
        distance,
        routeScore:
          place.score - proximityPenalty,
      };
    })
    .filter(
      (
        item,
      ): item is {
        place: ScoredPlannerPlace;
        openingNote: string;
        distance: number | null;
        routeScore: number;
      } => item !== null,
    )
    .sort(
      (left, right) =>
        right.routeScore -
          left.routeScore ||
        right.place.score -
          left.place.score ||
        left.place.name.localeCompare(
          right.place.name,
          "vi",
        ),
    );

  const best = available[0];

  if (!best) {
    return null;
  }

  return {
    place: best.place,
    openingNote: best.openingNote,
    distanceFromPreviousKm:
      best.distance,
  };
}

type ReadyForActivitiesState = {
  dateKey: string;
  minutes: number;
};

function formatMinutes(minutes: number): string {
  const normalized = Math.max(0, minutes);
  const hours = Math.floor(normalized / 60);
  const minutePart = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutePart,
  ).padStart(2, "0")}`;
}

function roundUpMinutes(
  minutes: number,
  step = 30,
): number {
  return Math.ceil(minutes / step) * step;
}

function parseDraftTimeToMinutes(
  value: string,
): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function getFlexibleDraftSchedule(
  minutes: number,
): {
  slot: InternalTripPlanActivity["slot"];
  slotLabel: string;
  time: string;
} {
  if (minutes >= 5 * 60 && minutes < 12 * 60) {
    return {
      slot: "MORNING",
      slotLabel: "Buổi sáng",
      time: formatMinutes(minutes),
    };
  }

  if (minutes >= 12 * 60 && minutes < 18 * 60) {
    return {
      slot: "AFTERNOON",
      slotLabel: "Buổi chiều",
      time: formatMinutes(minutes),
    };
  }

  return {
    slot: "EVENING",
    slotLabel:
      minutes < 5 * 60 ? "Rạng sáng" : "Buổi tối",
    time: formatMinutes(minutes),
  };
}

function getVietnamReadyState(
  travelEstimate: TripTravelEstimate | null,
): ReadyForActivitiesState | null {
  if (!travelEstimate) {
    return null;
  }

  const arrival = new Date(
    travelEstimate.arrivalAt,
  );

  if (Number.isNaN(arrival.getTime())) {
    return null;
  }

  const readyAt = new Date(
    arrival.getTime() +
      ARRIVAL_BUFFER_MINUTES * 60 * 1000,
  );
  const vietnamClock = new Date(
    readyAt.getTime() + 7 * 60 * 60 * 1000,
  );
  const year = vietnamClock.getUTCFullYear();
  const month = String(
    vietnamClock.getUTCMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    vietnamClock.getUTCDate(),
  ).padStart(2, "0");

  return {
    dateKey: `${year}-${month}-${day}`,
    minutes:
      vietnamClock.getUTCHours() * 60 +
      vietnamClock.getUTCMinutes(),
  };
}

function getSlotsForDate(
  dateKey: string,
  readyState: ReadyForActivitiesState | null,
) {
  if (!readyState || dateKey > readyState.dateKey) {
    return SLOT_DEFINITIONS;
  }

  if (dateKey < readyState.dateKey) {
    return [];
  }

  const readyMinutes = roundUpMinutes(
    readyState.minutes,
  );

  return SLOT_DEFINITIONS.flatMap((slot) => {
    const minutes = Math.max(
      slot.minutes,
      readyMinutes,
    );

    if (minutes > slot.latestMinutes) {
      return [];
    }

    return [
      {
        ...slot,
        minutes,
        time: formatMinutes(minutes),
      },
    ];
  });
}

function buildDays(
  candidates: ScoredPlannerPlace[],
  request: InternalTripPlanRequest,
  startDate: Date,
  travelEstimate: TripTravelEstimate | null,
): InternalTripPlanDay[] {
  const days: InternalTripPlanDay[] = [];
  const usedPlaceIds = new Set<string>();
  const readyState = getVietnamReadyState(
    travelEstimate,
  );

  for (
    let dayIndex = 0;
    dayIndex < request.duration;
    dayIndex += 1
  ) {
    const date = new Date(startDate);
    date.setUTCDate(
      startDate.getUTCDate() + dayIndex,
    );

    const dayOfWeek =
      DAY_OF_WEEK[date.getUTCDay()];
    const dateKey = formatDateKey(date);
    const slots = getSlotsForDate(
      dateKey,
      readyState,
    );

    const activities:
      InternalTripPlanActivity[] = [];

    let previousPlace:
      ScoredPlannerPlace | null = null;

    for (const slot of slots) {
      const selected =
        choosePlaceForSlot(
          candidates,
          usedPlaceIds,
          dayOfWeek,
          slot.minutes,
          previousPlace,
        );

      if (!selected) {
        continue;
      }

      const place = selected.place;
      usedPlaceIds.add(place.id);

      activities.push({
        slot: slot.slot,
        slotLabel: slot.label,
        time: slot.time,
        placeId: place.id,
        placeName: place.name,
        categoryName: place.category.name,
        addressLine: place.addressLine,
        provinceName: place.province.name,
        imageUrl: getPublicPlaceImageUrl(
          place.imagePath,
        ),
        shortDescription:
          place.shortDescription,
        seasonNote: place.seasonNote,
        entryPrice: place.entryPrice,
        currency: place.currency,
        score: place.score,
        reasons: place.reasons.slice(0, 3),
        openingNote:
          selected.openingNote,
        distanceFromPreviousKm:
          selected.distanceFromPreviousKm,
      });

      previousPlace = place;
    }

    let summary =
      "Lịch trình nhẹ, ưu tiên các điểm phù hợp nhất với dữ liệu hiện có.";

    if (
      readyState &&
      dateKey < readyState.dateKey
    ) {
      summary =
        "Ngày di chuyển đến điểm đến; chưa xếp hoạt động tham quan trước thời điểm dự kiến đến.";
    } else if (
      readyState &&
      dateKey === readyState.dateKey
    ) {
      const readyTime = formatMinutes(
        roundUpMinutes(readyState.minutes),
      );

      if (activities.length === 0) {
        summary =
          `Dự kiến sẵn sàng sau di chuyển vào khoảng ${readyTime}; phần còn lại của ngày phù hợp để nghỉ ngơi hoặc nhận phòng.`;
      } else {
        summary =
          `Hoạt động đầu tiên chỉ được xếp sau thời điểm dự kiến đến + ${ARRIVAL_BUFFER_MINUTES} phút buffer, khoảng ${readyTime}.`;
      }
    } else if (activities.length === 0) {
      summary =
        "Chưa tìm được địa điểm còn lại phù hợp giờ mở cửa; nên dành ngày này để nghỉ ngơi hoặc điều chỉnh số ngày.";
    } else if (activities.length === 1) {
      summary =
        "Ngày thư thả với một điểm chính, phù hợp để dành thêm thời gian nghỉ.";
    } else if (activities.length >= 3) {
      summary =
        "Ngày trải nghiệm đầy đủ sáng – chiều – tối, các điểm được ưu tiên theo điểm phù hợp và khoảng cách tương đối.";
    }

    days.push({
      dayNumber: dayIndex + 1,
      date: dateKey,
      dateLabel: formatDateLabel(date),
      summary,
      activities,
    });
  }

  return days;
}

function getEmptyReactionSignals():
  TripReactionInterestSignals {
  return {
    reactionCount: 0,
    signalPostCount: 0,
    weightedReactionScore: 0,
    reactionSummary: {
      LIKE: 0,
      LOVE: 0,
      WOW: 0,
    },
    saveCount: 0,
    savedSignalPostCount: 0,
    topPlaces: [],
    preferredMonths: [],
    topSavedPlaces: [],
    savedPreferredMonths: [],
    promptContext: null,
  };
}

export function isValidInternalTripDuration(
  value: number,
): boolean {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_DURATION_DAYS
  );
}

export function parseInternalTripStartDate(
  value: string,
): Date | null {
  return parseCalendarDate(value);
}

export async function buildInternalTripPlan(
  request: InternalTripPlanRequest,
  userId: string | null,
): Promise<InternalTripPlanGenerationResult> {
  const startDate =
    parseCalendarDate(request.startDate);

  if (!startDate) {
    throw new Error(
      "Start date must be validated before planning.",
    );
  }

  const departureAt =
    parseVietnamTripDeparture(
      request.startDate,
      request.departureTime,
    );

  if (!departureAt) {
    throw new Error(
      "Departure time must be validated before planning.",
    );
  }

  const allPlaces = await loadPlannerPlaces();

  const availableDestinations = [
    ...new Set(
      allPlaces.map(
        (place) => place.province.name,
      ),
    ),
  ].sort((left, right) =>
    left.localeCompare(right, "vi"),
  );

  const destinationTerms =
    buildDestinationTerms(
      request.destination,
    );

  const destinationPlaces =
    allPlaces.filter((place) =>
      placeMatchesDestination(
        place,
        destinationTerms,
      ),
    );

  if (destinationPlaces.length === 0) {
    return {
      plan: null,
      availableDestinations,
    };
  }

  const originTerms = buildDestinationTerms(
    request.origin,
  );
  const originPlaces = allPlaces.filter(
    (place) =>
      placeMatchesDestination(
        place,
        originTerms,
      ),
  );
  const travelEstimate =
    await estimateTripTravel({
      origin: request.origin,
      destination: request.destination,
      transportMode: request.transportMode,
      departureAt,
      fallbackOrigin:
        getPlaceCenter(originPlaces),
      fallbackDestination:
        getPlaceCenter(destinationPlaces),
    });
  const travelEstimateMessage =
    travelEstimate
      ? null
      : "Chưa đủ dữ liệu để ước tính thời gian di chuyển; lịch trình tạm dùng khung giờ mặc định 08:30 / 14:00 / 19:00.";

  let reactionSignals =
    getEmptyReactionSignals();

  if (userId) {
    reactionSignals =
      await getReactionInterestSignals(
        userId,
      );
  }

  const visitMonth =
    startDate.getUTCMonth() + 1;

  const scoredPlaces = scorePlaces(
    destinationPlaces,
    request,
    reactionSignals,
    visitMonth,
  );

  const days = buildDays(
    scoredPlaces,
    request,
    startDate,
    travelEstimate,
  );

  const scheduledActivities =
    days.flatMap((day) => day.activities);

  const matchedReactionPlaceCount =
    scoredPlaces.filter(
      (place) => place.reactionScore > 0,
    ).length;

  const matchedSavedPlaceCount =
    scoredPlaces.filter(
      (place) => place.savedBoost > 0,
    ).length;

  const estimatedEntryFees =
    scheduledActivities.reduce(
      (total, activity) =>
        total + activity.entryPrice,
      0,
    );

  const budgetEstimate =
    buildTripBudgetEstimate({
      totalBudget:
        request.totalBudget,
      travelerCount:
        request.travelerCount,
      duration: request.duration,
      transportMode:
        request.transportMode,
      travelEstimate,
      activities:
        scheduledActivities.map(
          (activity) => ({
            entryPrice:
              activity.entryPrice,
            distanceFromPreviousKm:
              activity.distanceFromPreviousKm,
          }),
        ),
    });

  return {
    plan: {
      origin: request.origin,
      destination: request.destination,
      startDate: request.startDate,
      departureTime: request.departureTime,
      transportMode: request.transportMode,
      travelEstimate,
      travelEstimateMessage,
      duration: request.duration,
      travelerCount:
        request.travelerCount,
      totalBudget:
        request.totalBudget,
      budgetEstimate,
      interests: request.interests,
      generatedAt: new Date().toISOString(),
      candidateCount:
        destinationPlaces.length,
      scheduledPlaceCount:
        scheduledActivities.length,
      estimatedEntryFees,
      currency: "VND",
      personalization: {
        applied:
          userId !== null &&
          (
            reactionSignals.reactionCount > 0 ||
            reactionSignals.saveCount > 0
          ),
        reactionCount:
          reactionSignals.reactionCount,
        saveCount:
          reactionSignals.saveCount,
        matchedPlaceCount:
          matchedReactionPlaceCount,
        matchedSavedPlaceCount,
        preferredMonths:
          reactionSignals.preferredMonths.map(
            (signal) => signal.month,
          ),
        savedPreferredMonths:
          reactionSignals.savedPreferredMonths.map(
            (signal) => signal.month,
          ),
      },
      scoringGuide: [
        "Ngày đầu chỉ xếp hoạt động sau ETA đến điểm đến + 60 phút buffer khi có ước tính di chuyển.",
        "Sở thích khớp nhóm địa điểm: cộng điểm.",
        "Đúng bestVisitMonths: cộng điểm mùa.",
        "Reaction: LIKE = 1, WOW = 2, LOVE = 3 rồi tăng trọng số địa điểm.",
        "Bài viết đã lưu: +3 mỗi bài liên quan, tối đa +6 điểm cho mỗi địa điểm để không lấn át các yếu tố khác.",
        "Ngân sách số được quy đổi theo ngân sách/người/ngày để ưu tiên địa điểm miễn phí, giá thấp hoặc trải nghiệm có phí phù hợp khả năng chi trả.",
        "Khung giờ chỉ chọn địa điểm đang mở theo dữ liệu openingHours; các điểm trong cùng ngày được ưu tiên gần nhau khi có tọa độ.",
      ],
      days,
    },
    availableDestinations,
  };
}

function buildAvailableDestinationNames(
  places: PlannerPlace[],
): string[] {
  return [
    ...new Set(
      places.map((place) => place.province.name),
    ),
  ].sort((left, right) =>
    left.localeCompare(right, "vi"),
  );
}

async function getDraftScoredPlaces(
  request: InternalTripPlanRequest,
  userId: string | null,
): Promise<{
  allPlaces: PlannerPlace[];
  destinationPlaces: PlannerPlace[];
  scoredPlaces: ScoredPlannerPlace[];
  availableDestinations: string[];
  reactionSignals: TripReactionInterestSignals;
  startDate: Date;
}> {
  const startDate = parseCalendarDate(request.startDate);

  if (!startDate) {
    throw new Error(
      "Start date must be validated before loading draft places.",
    );
  }

  const allPlaces = await loadPlannerPlaces();
  const availableDestinations =
    buildAvailableDestinationNames(allPlaces);
  const destinationTerms =
    buildDestinationTerms(request.destination);
  const destinationPlaces = allPlaces.filter((place) =>
    placeMatchesDestination(place, destinationTerms),
  );

  let reactionSignals = getEmptyReactionSignals();

  if (userId) {
    reactionSignals =
      await getReactionInterestSignals(userId);
  }

  const visitMonth = startDate.getUTCMonth() + 1;
  const scoredPlaces = scorePlaces(
    destinationPlaces,
    request,
    reactionSignals,
    visitMonth,
  );

  return {
    allPlaces,
    destinationPlaces,
    scoredPlaces,
    availableDestinations,
    reactionSignals,
    startDate,
  };
}

export async function buildInternalTripDraftOptions(
  request: InternalTripPlanRequest,
  userId: string | null,
): Promise<{
  options: InternalTripDraftPlaceOption[];
  availableDestinations: string[];
}> {
  const context = await getDraftScoredPlaces(
    request,
    userId,
  );

  return {
    options: context.scoredPlaces
      .slice(0, 60)
      .map((place) => ({
        placeId: place.id,
        placeName: place.name,
        categoryName: place.category.name,
        addressLine: place.addressLine,
        provinceName: place.province.name,
        imageUrl: getPublicPlaceImageUrl(place.imagePath),
        shortDescription: place.shortDescription,
        seasonNote: place.seasonNote,
        entryPrice: place.entryPrice,
        currency: place.currency,
        score: place.score,
        reasons: place.reasons,
      })),
    availableDestinations:
      context.availableDestinations,
  };
}

function expectedDraftDate(
  startDate: Date,
  dayNumber: number,
): string {
  const date = new Date(startDate);
  date.setUTCDate(
    startDate.getUTCDate() + dayNumber - 1,
  );
  return formatDateKey(date);
}

export async function buildCustomizedInternalTripPlan(
  request: InternalTripPlanRequest,
  userId: string | null,
  draftDays: InternalTripDraftDayInput[],
): Promise<InternalTripPlanGenerationResult> {
  const departureAt = parseVietnamTripDeparture(
    request.startDate,
    request.departureTime,
  );

  if (!departureAt) {
    throw new Error(
      "Departure time must be validated before saving a custom draft.",
    );
  }

  const context = await getDraftScoredPlaces(
    request,
    userId,
  );

  if (context.destinationPlaces.length === 0) {
    return {
      plan: null,
      availableDestinations:
        context.availableDestinations,
    };
  }

  if (draftDays.length !== request.duration) {
    throw new InternalTripDraftValidationError(
      "DRAFT_DAY_COUNT_CHANGED",
      "Draft không còn khớp số ngày của chuyến đi. Hãy tạo lại lịch trình.",
    );
  }

  const originTerms = buildDestinationTerms(
    request.origin,
  );
  const originPlaces = context.allPlaces.filter(
    (place) =>
      placeMatchesDestination(place, originTerms),
  );
  const travelEstimate = await estimateTripTravel({
    origin: request.origin,
    destination: request.destination,
    transportMode: request.transportMode,
    departureAt,
    fallbackOrigin: getPlaceCenter(originPlaces),
    fallbackDestination:
      getPlaceCenter(context.destinationPlaces),
  });
  const travelEstimateMessage = travelEstimate
    ? null
    : "Chưa đủ dữ liệu để ước tính thời gian di chuyển; draft dùng các khung giờ đã chọn và sẽ được kiểm tra trước khi lưu.";
  const readyState = getVietnamReadyState(
    travelEstimate,
  );
  const scoredById = new Map(
    context.scoredPlaces.map((place) => [
      place.id,
      place,
    ]),
  );
  const usedPlaceIds = new Set<string>();
  const dayInputByNumber = new Map(
    draftDays.map((day) => [
      day.dayNumber,
      day,
    ]),
  );
  const days: InternalTripPlanDay[] = [];

  for (
    let dayNumber = 1;
    dayNumber <= request.duration;
    dayNumber += 1
  ) {
    const dayInput = dayInputByNumber.get(dayNumber);
    const dateKey = expectedDraftDate(
      context.startDate,
      dayNumber,
    );

    if (!dayInput || dayInput.date !== dateKey) {
      throw new InternalTripDraftValidationError(
        "DRAFT_DAY_CHANGED",
        `Ngày ${dayNumber} của draft không còn hợp lệ. Hãy tạo lại lịch trình.`,
      );
    }

    if (
      dayInput.activities.length >
      MAX_CUSTOM_DRAFT_ACTIVITIES_PER_DAY
    ) {
      throw new InternalTripDraftValidationError(
        "DRAFT_ACTIVITY_PAYLOAD_TOO_LARGE",
        `Ngày ${dayNumber} có quá nhiều hoạt động để xử lý an toàn trong một lần lưu.`,
      );
    }

    const date = new Date(context.startDate);
    date.setUTCDate(
      context.startDate.getUTCDate() + dayNumber - 1,
    );
    const dayOfWeek = DAY_OF_WEEK[date.getUTCDay()];
    const usedTimes = new Set<string>();
    const activities: InternalTripPlanActivity[] = [];
    let previousPlace: ScoredPlannerPlace | null = null;
    let previousMinutes = -1;

    for (const activityInput of dayInput.activities) {
      const place = scoredById.get(
        activityInput.placeId,
      );

      if (!place) {
        throw new InternalTripDraftValidationError(
          "DRAFT_PLACE_UNAVAILABLE",
          "Một địa điểm trong draft đã bị ẩn, chưa được duyệt hoặc không còn thuộc điểm đến đã chọn.",
        );
      }

      if (usedPlaceIds.has(place.id)) {
        throw new InternalTripDraftValidationError(
          "DRAFT_DUPLICATE_PLACE",
          `Địa điểm “${place.name}” đang xuất hiện nhiều hơn một lần trong draft.`,
        );
      }

      const activityMinutes = parseDraftTimeToMinutes(
        activityInput.time,
      );

      if (
        activityMinutes === null ||
        usedTimes.has(activityInput.time) ||
        activityMinutes <= previousMinutes
      ) {
        throw new InternalTripDraftValidationError(
          "DRAFT_SLOT_INVALID",
          `Thời gian ${activityInput.time} ở ngày ${dayNumber} không hợp lệ, bị trùng hoặc không tăng dần theo timeline.`,
        );
      }

      if (
        readyState &&
        (
          dateKey < readyState.dateKey ||
          (
            dateKey === readyState.dateKey &&
            activityMinutes <
              roundUpMinutes(readyState.minutes)
          )
        )
      ) {
        throw new InternalTripDraftValidationError(
          "DRAFT_BEFORE_ARRIVAL",
          `Hoạt động lúc ${activityInput.time} ngày ${dayNumber} diễn ra trước ETA + ${ARRIVAL_BUFFER_MINUTES} phút buffer. Hãy đổi giờ hoặc chuyển hoạt động sang ngày sau.`,
        );
      }

      const schedule = getFlexibleDraftSchedule(
        activityMinutes,
      );
      const openingState = getOpeningState(
        place,
        dayOfWeek,
        activityMinutes,
      );

      if (!openingState.canVisit) {
        throw new InternalTripDraftValidationError(
          "DRAFT_PLACE_CLOSED",
          `“${place.name}” không khớp giờ mở cửa ở ${schedule.time} ngày ${dayNumber}. Hãy thay địa điểm hoặc đổi giờ.`,
        );
      }

      const distanceFromPreviousKm = previousPlace
        ? haversineDistanceKm(previousPlace, place)
        : null;

      activities.push({
        slot: schedule.slot,
        slotLabel: schedule.slotLabel,
        time: schedule.time,
        placeId: place.id,
        placeName: place.name,
        categoryName: place.category.name,
        addressLine: place.addressLine,
        provinceName: place.province.name,
        imageUrl: getPublicPlaceImageUrl(place.imagePath),
        shortDescription: place.shortDescription,
        seasonNote: place.seasonNote,
        entryPrice: place.entryPrice,
        currency: place.currency,
        score: place.score,
        reasons: place.reasons,
        openingNote: openingState.note,
        distanceFromPreviousKm,
      });

      usedPlaceIds.add(place.id);
      usedTimes.add(schedule.time);
      previousMinutes = activityMinutes;
      previousPlace = place;
    }

    days.push({
      dayNumber,
      date: dateKey,
      dateLabel: formatDateLabel(date),
      summary:
        activities.length > 0
          ? activities.length >= 7
            ? "Lịch ngày này được tùy chỉnh rất chi tiết; hãy dành đủ thời gian di chuyển và nghỉ giữa các hoạt động."
            : "Lịch ngày này đã được bạn tùy chỉnh; hệ thống xác minh lại địa điểm, giờ mở cửa và ngân sách trước khi lưu."
          : "Ngày này đang để trống trong draft tùy chỉnh.",
      activities,
    });
  }

  const scheduledActivities = days.flatMap(
    (day) => day.activities,
  );

  if (scheduledActivities.length === 0) {
    throw new InternalTripDraftValidationError(
      "EMPTY_DRAFT_ITINERARY",
      "Draft cần ít nhất một hoạt động tham quan trước khi lưu.",
    );
  }

  const matchedReactionPlaceCount =
    context.scoredPlaces.filter(
      (place) => place.reactionScore > 0,
    ).length;
  const matchedSavedPlaceCount =
    context.scoredPlaces.filter(
      (place) => place.savedBoost > 0,
    ).length;
  const estimatedEntryFees =
    scheduledActivities.reduce(
      (total, activity) =>
        total + activity.entryPrice,
      0,
    );
  const budgetEstimate = buildTripBudgetEstimate({
    totalBudget: request.totalBudget,
    travelerCount: request.travelerCount,
    duration: request.duration,
    transportMode: request.transportMode,
    travelEstimate,
    activities: scheduledActivities.map(
      (activity) => ({
        entryPrice: activity.entryPrice,
        distanceFromPreviousKm:
          activity.distanceFromPreviousKm,
      }),
    ),
  });

  return {
    plan: {
      origin: request.origin,
      destination: request.destination,
      startDate: request.startDate,
      departureTime: request.departureTime,
      transportMode: request.transportMode,
      travelEstimate,
      travelEstimateMessage,
      duration: request.duration,
      travelerCount: request.travelerCount,
      totalBudget: request.totalBudget,
      budgetEstimate,
      interests: request.interests,
      generatedAt: new Date().toISOString(),
      candidateCount: context.destinationPlaces.length,
      scheduledPlaceCount: scheduledActivities.length,
      estimatedEntryFees,
      currency: "VND",
      personalization: {
        applied:
          userId !== null &&
          (context.reactionSignals.reactionCount > 0 ||
            context.reactionSignals.saveCount > 0),
        reactionCount:
          context.reactionSignals.reactionCount,
        saveCount: context.reactionSignals.saveCount,
        matchedPlaceCount:
          matchedReactionPlaceCount,
        matchedSavedPlaceCount,
        preferredMonths:
          context.reactionSignals.preferredMonths.map(
            (signal) => signal.month,
          ),
        savedPreferredMonths:
          context.reactionSignals.savedPreferredMonths.map(
            (signal) => signal.month,
          ),
      },
      scoringGuide: [
        "Draft được lưu đúng thứ tự người dùng đã chỉnh; backend không regenerate lịch trình trước khi save.",
        "Mọi Place ID được kiểm tra lại phải VERIFIED, active và còn thuộc điểm đến đã chọn.",
        "Mỗi hoạt động dùng giờ do người dùng chọn; backend kiểm tra thứ tự thời gian và openingHours, ngày đầu vẫn tuân thủ ETA + 60 phút buffer.",
        "Dự toán ngân sách được tính lại từ draft đã chỉnh trước khi tạo Trip snapshot.",
      ],
      days,
    },
    availableDestinations:
      context.availableDestinations,
  };
}
