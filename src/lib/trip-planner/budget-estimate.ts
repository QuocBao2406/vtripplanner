import type {
  TripTransportMode,
  TripTravelEstimate,
} from "@/lib/trip-planner/travel-estimate";

export type TripBudgetProfile =
  | "ECONOMY"
  | "BALANCED"
  | "COMFORTABLE";

export type TripBudgetEstimate = {
  profile: TripBudgetProfile;
  profileLabel: string;
  totalBudget: number;
  travelerCount: number;
  duration: number;
  perPersonPerDay: number;
  transportCost: number;
  accommodationCost: number;
  foodCost: number;
  activityCost: number;
  reserveAmount: number;
  plannedCost: number;
  remainingAfterReserve: number;
  isOverBudget: boolean;
  currency: "VND";
  assumptions: string[];
};

type BudgetActivityInput = {
  entryPrice: number;
  distanceFromPreviousKm: number | null;
};

type BuildTripBudgetEstimateInput = {
  totalBudget: number;
  travelerCount: number;
  duration: number;
  transportMode: TripTransportMode;
  travelEstimate: TripTravelEstimate | null;
  activities: BudgetActivityInput[];
};

const PROFILE_LABELS: Record<
  TripBudgetProfile,
  string
> = {
  ECONOMY: "Tiết kiệm",
  BALANCED: "Cân bằng",
  COMFORTABLE: "Thoải mái",
};

const RESERVE_RATIO = 0.1;

function roundMoney(
  amount: number,
): number {
  return Math.max(
    0,
    Math.round(amount / 1000) * 1000,
  );
}

export function getPerPersonPerDayBudget(
  totalBudget: number,
  travelerCount: number,
  duration: number,
): number {
  const denominator = Math.max(
    1,
    travelerCount * duration,
  );

  return totalBudget / denominator;
}

export function getTripBudgetProfile(
  totalBudget: number,
  travelerCount: number,
  duration: number,
): TripBudgetProfile {
  const perPersonPerDay =
    getPerPersonPerDayBudget(
      totalBudget,
      travelerCount,
      duration,
    );

  if (perPersonPerDay <= 450000) {
    return "ECONOMY";
  }

  if (perPersonPerDay <= 1200000) {
    return "BALANCED";
  }

  return "COMFORTABLE";
}

export function getActivityBudgetScore(
  entryPrice: number,
  totalBudget: number,
  travelerCount: number,
  duration: number,
): {
  score: number;
  reason: string;
} {
  const profile = getTripBudgetProfile(
    totalBudget,
    travelerCount,
    duration,
  );
  const perPersonPerDay =
    getPerPersonPerDayBudget(
      totalBudget,
      travelerCount,
      duration,
    );
  const activityAllowance = Math.max(
    50000,
    perPersonPerDay * 0.22,
  );

  if (entryPrice <= 0) {
    return {
      score:
        profile === "ECONOMY"
          ? 4
          : profile === "BALANCED"
            ? 3
            : 1,
      reason:
        "Miễn phí hoặc chưa ghi nhận phí vào cửa; giúp giữ ngân sách cho các hạng mục khác.",
    };
  }

  const ratio =
    entryPrice / activityAllowance;

  if (ratio <= 0.5) {
    return {
      score: 3,
      reason:
        "Chi phí tham quan thấp so với ngân sách bình quân/người/ngày.",
    };
  }

  if (ratio <= 1) {
    return {
      score: 2,
      reason:
        "Chi phí tham quan phù hợp phần ngân sách dành cho hoạt động.",
    };
  }

  if (ratio <= 1.5) {
    return {
      score:
        profile === "COMFORTABLE"
          ? 1
          : 0,
      reason:
        profile === "COMFORTABLE"
          ? "Ngân sách thoải mái vẫn phù hợp trải nghiệm có phí này."
          : "Chi phí hoạt động hơi cao so với mức ngân sách hiện tại.",
    };
  }

  return {
    score:
      ratio > 2.25
        ? -4
        : -2,
    reason:
      "Chi phí hoạt động cao so với ngân sách hiện tại; hệ thống giảm ưu tiên.",
  };
}

function getProfileRates(
  profile: TripBudgetProfile,
): {
  foodPerPersonPerDay: number;
  roomPerNight: number;
} {
  if (profile === "ECONOMY") {
    return {
      foodPerPersonPerDay: 120000,
      roomPerNight: 300000,
    };
  }

  if (profile === "BALANCED") {
    return {
      foodPerPersonPerDay: 220000,
      roomPerNight: 600000,
    };
  }

  return {
    foodPerPersonPerDay: 400000,
    roomPerNight: 1200000,
  };
}

function getMainTransportCost(
  mode: TripTransportMode,
  travelerCount: number,
  distanceKm: number | null,
): number {
  if (distanceKm === null) {
    if (mode === "MOTORBIKE") {
      return (
        Math.ceil(travelerCount / 2) *
        300000
      );
    }

    if (mode === "CAR") {
      return (
        Math.ceil(travelerCount / 4) *
        1200000
      );
    }

    return travelerCount * 500000;
  }

  const roundTripDistance =
    distanceKm * 2;

  if (mode === "MOTORBIKE") {
    return (
      roundTripDistance *
      700 *
      Math.ceil(travelerCount / 2)
    );
  }

  if (mode === "CAR") {
    return (
      roundTripDistance *
      3500 *
      Math.ceil(travelerCount / 4)
    );
  }

  return (
    roundTripDistance *
    900 *
    travelerCount
  );
}

function getLocalTransportCost(
  mode: TripTransportMode,
  travelerCount: number,
  localDistanceKm: number,
): number {
  if (localDistanceKm <= 0) {
    return 0;
  }

  if (mode === "MOTORBIKE") {
    return (
      localDistanceKm *
      1500 *
      Math.ceil(travelerCount / 2)
    );
  }

  if (mode === "CAR") {
    return (
      localDistanceKm *
      6000 *
      Math.ceil(travelerCount / 4)
    );
  }

  return (
    localDistanceKm *
    5000 *
    Math.ceil(travelerCount / 4)
  );
}

export function buildTripBudgetEstimate(
  input: BuildTripBudgetEstimateInput,
): TripBudgetEstimate {
  const profile = getTripBudgetProfile(
    input.totalBudget,
    input.travelerCount,
    input.duration,
  );
  const rates = getProfileRates(profile);
  const nights = Math.max(
    0,
    input.duration - 1,
  );
  const rooms = Math.max(
    1,
    Math.ceil(input.travelerCount / 2),
  );

  const localDistanceKm =
    input.activities.reduce(
      (total, activity) =>
        total +
        (activity.distanceFromPreviousKm ??
          0),
      0,
    );

  const mainTransportCost =
    getMainTransportCost(
      input.transportMode,
      input.travelerCount,
      input.travelEstimate?.distanceKm ??
        null,
    );
  const localTransportCost =
    getLocalTransportCost(
      input.transportMode,
      input.travelerCount,
      localDistanceKm,
    );

  const transportCost = roundMoney(
    mainTransportCost +
      localTransportCost,
  );
  const accommodationCost = roundMoney(
    nights * rooms * rates.roomPerNight,
  );
  const foodCost = roundMoney(
    input.duration *
      input.travelerCount *
      rates.foodPerPersonPerDay,
  );
  const activityCost = roundMoney(
    input.activities.reduce(
      (total, activity) =>
        total +
        Math.max(0, activity.entryPrice) *
          input.travelerCount,
      0,
    ),
  );
  const reserveAmount = roundMoney(
    input.totalBudget * RESERVE_RATIO,
  );
  const plannedCost = roundMoney(
    transportCost +
      accommodationCost +
      foodCost +
      activityCost,
  );
  const remainingAfterReserve =
    roundMoney(
      Math.abs(
        input.totalBudget -
          plannedCost -
          reserveAmount,
      ),
    ) *
    (input.totalBudget -
        plannedCost -
        reserveAmount <
      0
      ? -1
      : 1);

  return {
    profile,
    profileLabel:
      PROFILE_LABELS[profile],
    totalBudget: roundMoney(
      input.totalBudget,
    ),
    travelerCount:
      input.travelerCount,
    duration: input.duration,
    perPersonPerDay: roundMoney(
      getPerPersonPerDayBudget(
        input.totalBudget,
        input.travelerCount,
        input.duration,
      ),
    ),
    transportCost,
    accommodationCost,
    foodCost,
    activityCost,
    reserveAmount,
    plannedCost,
    remainingAfterReserve,
    isOverBudget:
      remainingAfterReserve < 0,
    currency: "VND",
    assumptions: [
      "Di chuyển chính tạm tính theo quãng đường khứ hồi; xe khách chưa dùng giá vé thật của nhà xe.",
      "Lưu trú giả định 2 người/phòng và số đêm = số ngày - 1.",
      "Ăn uống và lưu trú dùng định mức nội bộ theo ngân sách bình quân/người/ngày.",
      "Chi phí hoạt động lấy entryPrice trong database và nhân theo số người.",
      "Dự phòng giữ 10% tổng ngân sách; đây là khoản nên để lại, không phải chi phí bắt buộc.",
    ],
  };
}
