import { prisma } from "@/lib/prisma";
import {
  getReactionInterestSignals,
  type TripReactionInterestSignals,
} from "@/lib/trip-planner/reaction-interest-signals";

const PLACE_IMAGE_BUCKET = "place-images";
const MAX_PLANNER_PLACES = 200;
const MAX_DURATION_DAYS = 7;

export type InternalTripBudget =
  | "ECONOMY"
  | "STANDARD"
  | "PREMIUM";

export type InternalTripPlanRequest = {
  destination: string;
  startDate: string;
  duration: number;
  budget: InternalTripBudget;
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
  destination: string;
  startDate: string;
  duration: number;
  budget: InternalTripBudget;
  interests: string[];
  generatedAt: string;
  candidateCount: number;
  scheduledPlaceCount: number;
  estimatedEntryFees: number;
  currency: string;
  personalization: {
    applied: boolean;
    reactionCount: number;
    matchedPlaceCount: number;
    preferredMonths: number[];
  };
  scoringGuide: string[];
  days: InternalTripPlanDay[];
};

export type InternalTripPlanGenerationResult = {
  plan: InternalTripPlan | null;
  availableDestinations: string[];
};

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
};

const SLOT_DEFINITIONS = [
  {
    slot: "MORNING" as const,
    label: "Buổi sáng",
    time: "08:30",
    minutes: 8 * 60 + 30,
  },
  {
    slot: "AFTERNOON" as const,
    label: "Buổi chiều",
    time: "14:00",
    minutes: 14 * 60,
  },
  {
    slot: "EVENING" as const,
    label: "Buổi tối",
    time: "19:00",
    minutes: 19 * 60,
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

function getBudgetScore(
  budget: InternalTripBudget,
  entryPrice: number,
): {
  score: number;
  reason: string | null;
} {
  if (entryPrice <= 0) {
    return {
      score: 2,
      reason: "Không có phí vào cửa trong dữ liệu hiện tại",
    };
  }

  if (budget === "ECONOMY") {
    if (entryPrice <= 50000) {
      return {
        score: 3,
        reason: "Phù hợp ngân sách tiết kiệm",
      };
    }

    if (entryPrice <= 100000) {
      return {
        score: 1,
        reason: "Chi phí tham quan vẫn ở mức vừa phải",
      };
    }

    return {
      score: -2,
      reason: null,
    };
  }

  if (budget === "STANDARD") {
    if (entryPrice <= 150000) {
      return {
        score: 2,
        reason: "Phù hợp ngân sách cân bằng",
      };
    }

    return {
      score: 0,
      reason: null,
    };
  }

  return {
    score: 1,
    reason: "Ngân sách thoải mái cho trải nghiệm này",
  };
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

      const budgetResult = getBudgetScore(
        request.budget,
        place.entryPrice,
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
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
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

function buildDays(
  candidates: ScoredPlannerPlace[],
  request: InternalTripPlanRequest,
  startDate: Date,
): InternalTripPlanDay[] {
  const days: InternalTripPlanDay[] = [];
  const usedPlaceIds = new Set<string>();

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

    const activities:
      InternalTripPlanActivity[] = [];

    let previousPlace:
      ScoredPlannerPlace | null = null;

    for (const slot of SLOT_DEFINITIONS) {
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

    if (activities.length === 0) {
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
      date: formatDateKey(date),
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
    topPlaces: [],
    preferredMonths: [],
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
  );

  const scheduledActivities =
    days.flatMap((day) => day.activities);

  const matchedReactionPlaceCount =
    scoredPlaces.filter(
      (place) => place.reactionScore > 0,
    ).length;

  const estimatedEntryFees =
    scheduledActivities.reduce(
      (total, activity) =>
        total + activity.entryPrice,
      0,
    );

  return {
    plan: {
      destination: request.destination,
      startDate: request.startDate,
      duration: request.duration,
      budget: request.budget,
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
          reactionSignals.reactionCount > 0,
        reactionCount:
          reactionSignals.reactionCount,
        matchedPlaceCount:
          matchedReactionPlaceCount,
        preferredMonths:
          reactionSignals.preferredMonths.map(
            (signal) => signal.month,
          ),
      },
      scoringGuide: [
        "Sở thích khớp nhóm địa điểm: cộng điểm.",
        "Đúng bestVisitMonths: cộng điểm mùa.",
        "Reaction: LIKE = 1, WOW = 2, LOVE = 3 rồi tăng trọng số địa điểm.",
        "Ngân sách dùng giá tham quan đang có trong database để ưu tiên tương đối.",
        "Khung giờ chỉ chọn địa điểm đang mở theo dữ liệu openingHours; các điểm trong cùng ngày được ưu tiên gần nhau khi có tọa độ.",
      ],
      days,
    },
    availableDestinations,
  };
}
