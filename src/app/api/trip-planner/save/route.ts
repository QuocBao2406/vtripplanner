import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  buildInternalTripPlan,
  isValidInternalTripDuration,
  parseInternalTripStartDate,
  type InternalTripBudget,
  type InternalTripPlanActivity,
} from "@/lib/trip-planner/internal-plan";

export const runtime = "nodejs";

const ALLOWED_BUDGETS =
  new Set<InternalTripBudget>([
    "ECONOMY",
    "STANDARD",
    "PREMIUM",
  ]);

const MAX_DESTINATION_LENGTH = 100;
const MAX_INTERESTS = 5;
const MAX_INTEREST_LENGTH = 80;
const ACTIVITY_DURATION_MINUTES = 120;

type SaveTripPayload = {
  destination: string;
  startDate: string;
  duration: number;
  budget: InternalTripBudget;
  interests: string[];
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

  const destination = readString(
    record.destination,
  );
  const startDate = readString(
    record.startDate,
  );

  const duration =
    typeof record.duration === "number"
      ? record.duration
      : Number(record.duration);

  const rawBudget = readString(
    record.budget,
  ).toUpperCase();

  const budget =
    rawBudget as InternalTripBudget;

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

  if (!ALLOWED_BUDGETS.has(budget)) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_BUDGET",
        "Mức ngân sách không hợp lệ.",
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
      destination,
      startDate,
      duration,
      budget,
      interests,
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

  if (!parsed.ok) {
    return parsed.response;
  }

  const input = parsed.value;

  try {
    const generation =
      await buildInternalTripPlan(
        input,
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
        "Lịch trình chưa có hoạt động để lưu.",
      );
    }

    const startDate =
      parseInternalTripStartDate(
        plan.startDate,
      );

    if (!startDate) {
      throw new Error(
        "Generated plan contains invalid start date.",
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
          startDate,
          endDate,
          currency: "VND",
          status: "READY",
          notes:
            "Lịch trình được lưu từ Trip Planner nội bộ của VTripPlanner.",
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

                          const endsAt =
                            new Date(
                              startsAt.getTime() +
                                ACTIVITY_DURATION_MINUTES *
                                  60 *
                                  1000,
                            );

                          return {
                            place: {
                              connect: {
                                id: activity.placeId,
                              },
                            },
                            type: "VISIT",
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
                              activityIndex,
                            notes:
                              buildActivityNotes(
                                activity,
                              ),
                          };
                        },
                      ),
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
            plan.scheduledPlaceCount,
        },
      },
      { status: 201 },
    );
  } catch (error) {
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
