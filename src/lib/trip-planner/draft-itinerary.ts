export const TRIP_DRAFT_STORAGE_KEY =
  "vtripplanner:trip-draft:v1";

export const MAX_DRAFT_ACTIVITIES_PER_DAY = 3;

export type TripDraftTransportMode =
  | "MOTORBIKE"
  | "CAR"
  | "COACH";

export type TripDraftTravelEstimate = {
  origin: string;
  destination: string;
  transportMode: TripDraftTransportMode;
  departureAt: string;
  arrivalAt: string;
  distanceKm: number | null;
  durationMinutes: number;
  source: "GOOGLE_ROUTES" | "INTERNAL_FALLBACK";
  sourceLabel: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  warning: string | null;
};

export type TripDraftBudgetEstimate = {
  profile: "ECONOMY" | "BALANCED" | "COMFORTABLE";
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

export type TripDraftActivity = {
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

export type TripDraftDay = {
  dayNumber: number;
  date: string;
  dateLabel: string;
  summary: string;
  activities: TripDraftActivity[];
};

export type TripDraftPlan = {
  origin: string;
  destination: string;
  startDate: string;
  departureTime: string;
  transportMode: TripDraftTransportMode;
  travelEstimate: TripDraftTravelEstimate | null;
  travelEstimateMessage: string | null;
  duration: number;
  travelerCount: number;
  totalBudget: number;
  budgetEstimate: TripDraftBudgetEstimate;
  interests: string[];
  candidateCount: number;
  scheduledPlaceCount: number;
  estimatedEntryFees: number;
  currency: string;
  days: TripDraftDay[];
};

export type StoredTripDraft = {
  version: 1;
  storedAt: string;
  plan: TripDraftPlan;
};

export type TripDraftPlaceOption = {
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

export type TripDraftActivityInput = {
  placeId: string;
  time: string;
};

export type TripDraftDayInput = {
  dayNumber: number;
  date: string;
  activities: TripDraftActivityInput[];
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isStoredTripDraft(
  value: unknown,
): value is StoredTripDraft {
  if (!isRecord(value) || value.version !== 1) {
    return false;
  }

  if (!isRecord(value.plan)) {
    return false;
  }

  const plan = value.plan;

  if (
    typeof plan.origin !== "string" ||
    typeof plan.destination !== "string" ||
    typeof plan.startDate !== "string" ||
    typeof plan.departureTime !== "string" ||
    typeof plan.transportMode !== "string" ||
    typeof plan.duration !== "number" ||
    typeof plan.travelerCount !== "number" ||
    typeof plan.totalBudget !== "number" ||
    !Array.isArray(plan.interests) ||
    !Array.isArray(plan.days) ||
    !isRecord(plan.budgetEstimate)
  ) {
    return false;
  }

  return plan.days.every((day) => {
    if (!isRecord(day) || !Array.isArray(day.activities)) {
      return false;
    }

    return (
      typeof day.dayNumber === "number" &&
      typeof day.date === "string" &&
      typeof day.dateLabel === "string" &&
      day.activities.every(
        (activity) =>
          isRecord(activity) &&
          typeof activity.placeId === "string" &&
          typeof activity.placeName === "string" &&
          typeof activity.time === "string" &&
          typeof activity.entryPrice === "number",
      )
    );
  });
}

export function toTripDraftDayInputs(
  days: TripDraftDay[],
): TripDraftDayInput[] {
  return days.map((day) => ({
    dayNumber: day.dayNumber,
    date: day.date,
    activities: day.activities.map((activity) => ({
      placeId: activity.placeId,
      time: activity.time,
    })),
  }));
}
