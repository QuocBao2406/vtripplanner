import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { TransportMode } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  buildCustomizedInternalTripPlan,
  buildInternalTripPlan,
  InternalTripDraftValidationError,
  isValidInternalTripDuration,
  parseInternalTripStartDate,
  type InternalTripDraftDayInput,
  type InternalTripPlanActivity,
} from "@/lib/trip-planner/internal-plan";
import {
  isTripTransportMode,
  parseVietnamTripDeparture,
  type TripTransportMode,
  type TripTravelEstimate,
} from "@/lib/trip-planner/travel-estimate";

export const runtime = "nodejs";

const MIN_TRAVELER_COUNT = 1;
const MAX_TRAVELER_COUNT = 20;
const MIN_TOTAL_BUDGET = 100000;
const MAX_TOTAL_BUDGET = 1000000000;

const MAX_ORIGIN_LENGTH = 150;
const MAX_DESTINATION_LENGTH = 100;
const MAX_INTERESTS = 5;
const MAX_INTEREST_LENGTH = 80;
const MAX_DRAFT_ACTIVITY_PAYLOAD_PER_DAY = 24;
const DEFAULT_ACTIVITY_DURATION_MINUTES = 90;

type SaveTripPayload = {
  origin: string;
  destination: string;
  startDate: string;
  departureTime: string;
  transportMode: TripTransportMode;
  duration: number;
  travelerCount: number;
  totalBudget: number;
  interests: string[];
  draftDays: InternalTripDraftDayInput[] | null;
};

function errorResponse(
  status: number,
  error: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
    },
    { status },
  );
}

function readString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}


function parseDraftDays(
  value: unknown,
):
  | {
      ok: true;
      value: InternalTripDraftDayInput[] | null;
    }
  | {
      ok: false;
      response: NextResponse;
    } {
  if (value === undefined || value === null) {
    return {
      ok: true,
      value: null,
    };
  }

  if (!Array.isArray(value) || value.length > 7) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_DRAFT_DAYS",
        "Draft lịch trình không hợp lệ.",
      ),
    };
  }

  const parsedDays: InternalTripDraftDayInput[] = [];
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const timePattern =
    /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      return {
        ok: false,
        response: errorResponse(
          400,
          "INVALID_DRAFT_DAY",
          "Một ngày trong draft không hợp lệ.",
        ),
      };
    }

    const record = item as Record<string, unknown>;
    const dayNumber = Number(record.dayNumber);
    const date = readString(record.date);
    const activities = record.activities;

    if (
      !Number.isInteger(dayNumber) ||
      dayNumber < 1 ||
      dayNumber > 7 ||
      !datePattern.test(date) ||
      !Array.isArray(activities) ||
      activities.length > MAX_DRAFT_ACTIVITY_PAYLOAD_PER_DAY
    ) {
      return {
        ok: false,
        response: errorResponse(
          400,
          "INVALID_DRAFT_DAY",
          "Ngày hoặc dữ liệu hoạt động trong draft không hợp lệ.",
        ),
      };
    }

    const parsedActivities: InternalTripDraftDayInput["activities"] = [];

    for (const activity of activities) {
      if (
        typeof activity !== "object" ||
        activity === null
      ) {
        return {
          ok: false,
          response: errorResponse(
            400,
            "INVALID_DRAFT_ACTIVITY",
            "Hoạt động trong draft không hợp lệ.",
          ),
        };
      }

      const activityRecord =
        activity as Record<string, unknown>;
      const placeId = readString(
        activityRecord.placeId,
      );
      const time = readString(activityRecord.time);

      if (
        !uuidPattern.test(placeId) ||
        !timePattern.test(time)
      ) {
        return {
          ok: false,
          response: errorResponse(
            400,
            "INVALID_DRAFT_ACTIVITY",
            "Địa điểm hoặc khung giờ trong draft không hợp lệ.",
          ),
        };
      }

      parsedActivities.push({
        placeId,
        time,
      });
    }

    parsedDays.push({
      dayNumber,
      date,
      activities: parsedActivities,
    });
  }

  return {
    ok: true,
    value: parsedDays,
  };
}

function parsePayload(
  payload: unknown,
):
  | {
      ok: true;
      value: SaveTripPayload;
    }
  | {
      ok: false;
      response: NextResponse;
    } {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_SAVE_REQUEST",
        "Dữ liệu lưu chuyến đi không hợp lệ.",
      ),
    };
  }

  const record =
    payload as Record<string, unknown>;

  const origin = readString(
    record.origin,
  );
  const destination = readString(
    record.destination,
  );
  const startDate = readString(
    record.startDate,
  );
  const departureTime = readString(
    record.departureTime,
  );
  const rawTransportMode = readString(
    record.transportMode,
  ).toUpperCase();

  const duration =
    typeof record.duration === "number"
      ? record.duration
      : Number(record.duration);

  const travelerCount =
    typeof record.travelerCount === "number"
      ? record.travelerCount
      : Number(record.travelerCount);

  const totalBudget =
    typeof record.totalBudget === "number"
      ? record.totalBudget
      : Number(record.totalBudget);

  const interests = Array.isArray(
    record.interests,
  )
    ? [
        ...new Set(
          record.interests
            .filter(
              (
                value,
              ): value is string =>
                typeof value === "string",
            )
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ]
    : [];

  const parsedDraftDays = parseDraftDays(
    record.draftDays,
  );

  if (parsedDraftDays.ok === false) {
    return {
      ok: false,
      response: parsedDraftDays.response,
    };
  }

  if (
    origin.length < 2 ||
    origin.length > MAX_ORIGIN_LENGTH
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_ORIGIN",
        "Điểm xuất phát cần từ 2 đến 150 ký tự.",
      ),
    };
  }

  if (
    destination.length < 2 ||
    destination.length >
      MAX_DESTINATION_LENGTH
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_DESTINATION",
        "Điểm đến cần từ 2 đến 100 ký tự.",
      ),
    };
  }

  if (
    !parseInternalTripStartDate(
      startDate,
    )
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_START_DATE",
        "Ngày bắt đầu không hợp lệ.",
      ),
    };
  }

  if (
    !parseVietnamTripDeparture(
      startDate,
      departureTime,
    )
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_DEPARTURE_TIME",
        "Giờ khởi hành không hợp lệ.",
      ),
    };
  }

  if (!isTripTransportMode(rawTransportMode)) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_TRANSPORT_MODE",
        "Phương tiện phải là xe máy, ô tô hoặc xe khách.",
      ),
    };
  }

  if (
    !isValidInternalTripDuration(
      duration,
    )
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_DURATION",
        "Số ngày phải từ 1 đến 7.",
      ),
    };
  }

  if (
    !Number.isInteger(travelerCount) ||
    travelerCount < MIN_TRAVELER_COUNT ||
    travelerCount > MAX_TRAVELER_COUNT
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_TRAVELER_COUNT",
        "Số người phải từ 1 đến 20.",
      ),
    };
  }

  if (
    !Number.isFinite(totalBudget) ||
    totalBudget < MIN_TOTAL_BUDGET ||
    totalBudget > MAX_TOTAL_BUDGET
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_TOTAL_BUDGET",
        "Tổng ngân sách phải từ 100.000đ đến 1.000.000.000đ.",
      ),
    };
  }

  if (
    interests.length > MAX_INTERESTS ||
    interests.some(
      (interest) =>
        interest.length >
        MAX_INTEREST_LENGTH,
    )
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_INTERESTS",
        "Chỉ chọn tối đa 5 sở thích hợp lệ.",
      ),
    };
  }

  return {
    ok: true,
    value: {
      origin,
      destination,
      startDate,
      departureTime,
      transportMode: rawTransportMode,
      duration,
      travelerCount,
      totalBudget,
      interests,
      draftDays: parsedDraftDays.value,
    },
  };
}

function addCalendarDays(
  date: Date,
  days: number,
): Date {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days,
  );

  return result;
}

function activityStartDateTime(
  date: string,
  time: string,
): Date {
  const value = new Date(
    `${date}T${time}:00+07:00`,
  );

  if (Number.isNaN(value.getTime())) {
    throw new Error(
      `Invalid activity datetime: ${date} ${time}`,
    );
  }

  return value;
}

function buildActivityNotes(
  activity: InternalTripPlanActivity,
): string {
  const notes = [
    activity.openingNote,
    ...activity.reasons,
  ]
    .filter(Boolean)
    .join(" · ");

  return notes.slice(0, 1000);
}

function getFirstScheduledPlaceId(
  days: Array<{
    activities: InternalTripPlanActivity[];
  }>,
): string | null {
  for (const day of days) {
    const firstActivity =
      day.activities[0];

    if (firstActivity) {
      return firstActivity.placeId;
    }
  }

  return null;
}

function mapTransportMode(
  mode: TripTransportMode,
): TransportMode {
  if (mode === "MOTORBIKE") {
    return TransportMode.MOTORBIKE;
  }

  if (mode === "CAR") {
    return TransportMode.PRIVATE_CAR;
  }

  return TransportMode.BUS;
}

function getTransportLabel(
  mode: TripTransportMode,
): string {
  if (mode === "MOTORBIKE") {
    return "Xe máy";
  }

  if (mode === "CAR") {
    return "Ô tô";
  }

  return "Xe khách";
}

function buildTravelActivity(
  plan: {
    origin: string;
    destination: string;
    transportMode: TripTransportMode;
    travelEstimate: TripTravelEstimate | null;
  },
) {
  if (!plan.travelEstimate) {
    return null;
  }

  const startsAt = new Date(
    plan.travelEstimate.departureAt,
  );
  const endsAt = new Date(
    plan.travelEstimate.arrivalAt,
  );

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    return null;
  }

  const details = [
    `${getTransportLabel(plan.transportMode)} từ ${plan.origin} đến ${plan.destination}`,
    plan.travelEstimate.distanceKm !== null
      ? `Khoảng ${plan.travelEstimate.distanceKm} km`
      : null,
    `${plan.travelEstimate.durationMinutes} phút`,
    `Nguồn: ${plan.travelEstimate.sourceLabel}`,
    `Độ tin cậy: ${plan.travelEstimate.confidence}`,
    plan.travelEstimate.warning,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    type: "TRANSPORT" as const,
    title:
      `Di chuyển ${plan.origin} → ${plan.destination}`.slice(
        0,
        200,
      ),
    description:
      `Khởi hành bằng ${getTransportLabel(plan.transportMode)}.`.slice(
        0,
        2000,
      ),
    startsAt,
    endsAt,
    sortOrder: 0,
    notes: details.slice(0, 1000),
  };
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return errorResponse(
      401,
      "AUTH_REQUIRED",
      "Vui lòng đăng nhập để lưu chuyến đi.",
    );
  }

  const applicationUser =
    await prisma.user.findFirst({
      where: {
        id: authUser.id,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

  if (!applicationUser) {
    return errorResponse(
      403,
      "APPLICATION_USER_REQUIRED",
      "Tài khoản chưa sẵn sàng để lưu chuyến đi.",
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Không thể đọc dữ liệu lưu chuyến đi.",
    );
  }

  const parsed = parsePayload(payload);

  if (parsed.ok === false) {
    return parsed.response;
  }

  const input = parsed.value;

  try {
    const planningRequest = {
      origin: input.origin,
      destination: input.destination,
      startDate: input.startDate,
      departureTime: input.departureTime,
      transportMode: input.transportMode,
      duration: input.duration,
      travelerCount: input.travelerCount,
      totalBudget: input.totalBudget,
      interests: input.interests,
    };

    const generation = input.draftDays
      ? await buildCustomizedInternalTripPlan(
          planningRequest,
          applicationUser.id,
          input.draftDays,
        )
      : await buildInternalTripPlan(
          planningRequest,
          applicationUser.id,
        );

    const plan = generation.plan;

    if (!plan) {
      return errorResponse(
        422,
        "DESTINATION_NOT_SUPPORTED",
        "Điểm đến này hiện chưa đủ dữ liệu để lưu lịch trình.",
      );
    }

    if (
      plan.scheduledPlaceCount < 1
    ) {
      return errorResponse(
        422,
        "EMPTY_ITINERARY",
        "Lịch trình chưa có hoạt động tham quan để lưu. Hãy tăng số ngày hoặc đổi giờ khởi hành.",
      );
    }

    const startDate =
      parseInternalTripStartDate(
        plan.startDate,
      );
    const departureAt =
      parseVietnamTripDeparture(
        plan.startDate,
        plan.departureTime,
      );

    if (!startDate || !departureAt) {
      throw new Error(
        "Generated plan contains invalid trip date/time.",
      );
    }

    const endDate = addCalendarDays(
      startDate,
      plan.duration - 1,
    );

    const firstPlaceId =
      getFirstScheduledPlaceId(
        plan.days,
      );

    const firstPlace = firstPlaceId
      ? await prisma.place.findFirst({
          where: {
            id: firstPlaceId,
            verificationStatus:
              "VERIFIED",
            isActive: true,
            deletedAt: null,
          },
          select: {
            provinceId: true,
          },
        })
      : null;

    if (!firstPlace) {
      return errorResponse(
        409,
        "PLAN_DATA_CHANGED",
        "Dữ liệu địa điểm vừa thay đổi. Hãy tạo lại lịch trình trước khi lưu.",
      );
    }

    const title =
      `Chuyến đi ${plan.destination} · ${plan.duration} ngày`
        .slice(0, 200);
    const travelActivity =
      buildTravelActivity(plan);
    const savedActivityCount =
      plan.scheduledPlaceCount +
      (travelActivity ? 1 : 0);

    const savedTrip =
      await prisma.trip.create({
        data: {
          owner: {
            connect: {
              id: applicationUser.id,
            },
          },
          destinationProvince: {
            connect: {
              id: firstPlace.provinceId,
            },
          },
          title,
          originName: plan.origin,
          destinationName: plan.destination,
          departureAt,
          estimatedArrivalAt:
            plan.travelEstimate
              ? new Date(
                  plan.travelEstimate.arrivalAt,
                )
              : null,
          estimatedTravelDistanceKm:
            plan.travelEstimate?.distanceKm ?? null,
          estimatedTravelDurationMinutes:
            plan.travelEstimate?.durationMinutes ?? null,
          travelEstimateSource:
            plan.travelEstimate?.source ?? null,
          travelEstimateConfidence:
            plan.travelEstimate?.confidence ?? null,
          travelerCount:
            plan.travelerCount,
          totalBudget:
            plan.totalBudget,
          estimatedTransportCost:
            plan.budgetEstimate.transportCost,
          estimatedAccommodationCost:
            plan.budgetEstimate.accommodationCost,
          estimatedFoodCost:
            plan.budgetEstimate.foodCost,
          estimatedActivityCost:
            plan.budgetEstimate.activityCost,
          estimatedReserveAmount:
            plan.budgetEstimate.reserveAmount,
          estimatedTotalCost:
            plan.budgetEstimate.plannedCost,
          estimatedBudgetRemaining:
            plan.budgetEstimate.remainingAfterReserve,
          startDate,
          endDate,
          currency: "VND",
          status: "READY",
          notes: input.draftDays
            ? "Lịch trình được lưu từ draft do người dùng tùy chỉnh; backend đã xác minh lại địa điểm, giờ mở cửa, ETA và dự toán ngân sách trước khi tạo snapshot."
            : "Lịch trình được lưu từ Trip Planner nội bộ của VTripPlanner; ETA và dự toán ngân sách là snapshot tại thời điểm lưu.",
          transportPreference: {
            create: {
              mainMode: mapTransportMode(
                plan.transportMode,
              ),
              notes:
                plan.travelEstimate?.warning?.slice(
                  0,
                  1000,
                ) ?? null,
            },
          },
          days: {
            create: plan.days.map(
              (day) => {
                const tripDayDate =
                  parseInternalTripStartDate(
                    day.date,
                  );

                if (!tripDayDate) {
                  throw new Error(
                    `Invalid generated day date: ${day.date}`,
                  );
                }

                const visitActivities =
                  day.activities.map(
                    (
                      activity,
                      activityIndex,
                    ) => {
                      const startsAt =
                        activityStartDateTime(
                          day.date,
                          activity.time,
                        );

                      const defaultEndsAt =
                        new Date(
                          startsAt.getTime() +
                            DEFAULT_ACTIVITY_DURATION_MINUTES *
                              60 *
                              1000,
                        );
                      const nextActivity =
                        day.activities[activityIndex + 1];
                      const nextStartsAt = nextActivity
                        ? activityStartDateTime(
                            day.date,
                            nextActivity.time,
                          )
                        : null;
                      const endsAt =
                        nextStartsAt && nextStartsAt > startsAt
                          ? new Date(
                              Math.min(
                                defaultEndsAt.getTime(),
                                nextStartsAt.getTime(),
                              ),
                            )
                          : defaultEndsAt;

                      return {
                        place: {
                          connect: {
                            id: activity.placeId,
                          },
                        },
                        type: "VISIT" as const,
                        title:
                          activity.placeName.slice(
                            0,
                            200,
                          ),
                        description:
                          activity.shortDescription
                            ?.slice(
                              0,
                              2000,
                            ) ??
                          null,
                        startsAt,
                        endsAt,
                        sortOrder:
                          activityIndex +
                          (day.dayNumber === 1 &&
                          travelActivity
                            ? 1
                            : 0),
                        notes:
                          buildActivityNotes(
                            activity,
                          ),
                      };
                    },
                  );

                return {
                  dayNumber:
                    day.dayNumber,
                  date: tripDayDate,
                  title:
                    `Ngày ${day.dayNumber} · ${plan.destination}`
                      .slice(0, 200),
                  notes:
                    day.summary.slice(
                      0,
                      1000,
                    ),
                  activities: {
                    create:
                      day.dayNumber === 1 &&
                      travelActivity
                        ? [
                            travelActivity,
                            ...visitActivities,
                          ]
                        : visitActivities,
                  },
                };
              },
            ),
          },
        },
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          _count: {
            select: {
              days: true,
            },
          },
        },
      });

    revalidatePath("/");
    revalidatePath("/lap-lich-trinh");
    revalidatePath("/chuyen-di-cua-toi");
    revalidatePath("/tai-khoan");

    return NextResponse.json(
      {
        ok: true,
        savedTrip: {
          id: savedTrip.id,
          title: savedTrip.title,
          status: savedTrip.status,
          startDate:
            savedTrip.startDate,
          endDate:
            savedTrip.endDate,
          dayCount:
            savedTrip._count.days,
          activityCount:
            savedActivityCount,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof
      InternalTripDraftValidationError
    ) {
      return errorResponse(
        409,
        error.code,
        error.message,
      );
    }

    console.error(
      "Trip save failed:",
      error,
    );

    return errorResponse(
      500,
      "TRIP_SAVE_FAILED",
      "Không thể lưu chuyến đi lúc này. Vui lòng thử lại.",
    );
  }
}
