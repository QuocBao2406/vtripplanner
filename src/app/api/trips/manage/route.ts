import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { TripStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 200;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function GET(request: Request): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const userId = authorization.applicationUser.id;
  const url = new URL(request.url);
  const tripId = url.searchParams.get("tripId");

  try {
    if (tripId) {
      const tripIdError = validateTripId(tripId);
      if (tripIdError) {
        return tripIdError;
      }

      const trip = await prisma.trip.findFirst({
        where: {
          id: tripId,
          ownerUserId: userId,
          deletedAt: null,
        },
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: {
              activities: {
                orderBy: { startsAt: "asc" },
                include: {
                  place: {
                    select: {
                      id: true,
                      name: true,
                      addressLine: true,
                      latitude: true,
                      longitude: true,
                      images: {
                        where: { isCover: true },
                        take: 1,
                        select: { storagePath: true },
                      },
                    },
                  },
                },
              },
            },
          },
          checklists: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
          expenseEntries: {
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          },
          managedBudget: true,
        },
      });

      if (!trip) {
        return errorResponse(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi.");
      }

      return NextResponse.json({
        ok: true,
        trip,
      });
    }

    const trips = await prisma.trip.findMany({
      where: {
        ownerUserId: userId,
        deletedAt: null,
      },
      orderBy: [
        { createdAt: "desc" },
        { startDate: "desc" },
      ],
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        originName: true,
        destinationName: true,
        departureAt: true,
        estimatedArrivalAt: true,
        estimatedTravelDistanceKm: true,
        estimatedTravelDurationMinutes: true,
        travelerCount: true,
        totalBudget: true,
        estimatedTotalCost: true,
        currency: true,
        createdAt: true,
        days: {
          orderBy: { dayNumber: "asc" },
          select: {
            id: true,
            dayNumber: true,
            date: true,
            activities: {
              orderBy: { startsAt: "asc" },
              select: {
                id: true,
                title: true,
                type: true,
                startsAt: true,
                endsAt: true,
                place: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        checklists: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            items: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        expenseEntries: {
          select: {
            id: true,
            category: true,
            actualAmount: true,
            estimatedAmount: true,
          },
        },
        managedBudget: {
          select: {
            plannedAmount: true,
            contingencyAmount: true,
            currency: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      trips,
    });
  } catch (error) {
    console.error("GET /api/trips/manage failed:", error);
    return errorResponse(500, "TRIPS_FETCH_FAILED", "Không thể lấy danh sách chuyến đi.");
  }
}

async function getAuthenticatedApplicationUser() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return {
      ok: false as const,
      response: errorResponse(
        401,
        "AUTH_REQUIRED",
        "Vui lòng đăng nhập để quản lý chuyến đi.",
      ),
    };
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
    return {
      ok: false as const,
      response: errorResponse(
        403,
        "APPLICATION_USER_REQUIRED",
        "Tài khoản chưa sẵn sàng để quản lý chuyến đi.",
      ),
    };
  }

  return {
    ok: true as const,
    applicationUser,
  };
}

function readString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

async function readPayload(
  request: Request,
): Promise<
  | {
      ok: true;
      record: Record<string, unknown>;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_JSON",
        "Không thể đọc dữ liệu chuyến đi.",
      ),
    };
  }

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_TRIP_REQUEST",
        "Dữ liệu chuyến đi không hợp lệ.",
      ),
    };
  }

  return {
    ok: true,
    record:
      payload as Record<string, unknown>,
  };
}

function validateTripId(
  tripId: string,
): NextResponse | null {
  if (!UUID_PATTERN.test(tripId)) {
    return errorResponse(
      400,
      "INVALID_TRIP_ID",
      "Chuyến đi không hợp lệ.",
    );
  }

  return null;
}

export async function PATCH(
  request: Request,
): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const payload = await readPayload(request);

  if (!payload.ok) {
    return payload.response;
  }

  const tripId = readString(
    payload.record,
    "tripId",
  );
  const title = readString(
    payload.record,
    "title",
  );
  const status = readString(
    payload.record,
    "status",
  );

  const tripIdError =
    validateTripId(tripId);

  if (tripIdError) {
    return tripIdError;
  }

  if (!title && !status) {
    return errorResponse(
      400,
      "DATA_REQUIRED",
      "Vui lòng cung cấp tên hoặc trạng thái cần cập nhật.",
    );
  }

  if (title && title.length > MAX_TITLE_LENGTH) {
    return errorResponse(
      400,
      "TITLE_TOO_LONG",
      `Tên chuyến đi tối đa ${MAX_TITLE_LENGTH} ký tự.`,
    );
  }

  const validStatuses: Record<string, TripStatus> = TripStatus;
  if (status && !validStatuses[status]) {
    return errorResponse(
      400,
      "INVALID_STATUS",
      `Trạng thái '${status}' không hợp lệ.`,
    );
  }

  const userId =
    authorization.applicationUser.id;

  try {
    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (status) updateData.status = status as TripStatus;

    const updateResult =
      await prisma.trip.updateMany({
        where: {
          id: tripId,
          ownerUserId: userId,
          deletedAt: null,
        },
        data: updateData,
      });

    if (updateResult.count !== 1) {
      return errorResponse(
        404,
        "TRIP_NOT_FOUND",
        "Không tìm thấy chuyến đi thuộc tài khoản của bạn.",
      );
    }

    revalidatePath(
      "/chuyen-di-cua-toi",
    );

    return NextResponse.json({
      ok: true,
      trip: {
        id: tripId,
        ...(title ? { title } : {}),
        ...(status ? { status } : {}),
      },
    });
  } catch (error) {
    console.error(
      "Trip update failed:",
      error,
    );

    return errorResponse(
      500,
      "TRIP_UPDATE_FAILED",
      "Không thể cập nhật chuyến đi. Vui lòng thử lại.",
    );
  }
}

export async function DELETE(
  request: Request,
): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const payload = await readPayload(request);

  if (!payload.ok) {
    return payload.response;
  }

  const tripId = readString(
    payload.record,
    "tripId",
  );

  const tripIdError =
    validateTripId(tripId);

  if (tripIdError) {
    return tripIdError;
  }

  const userId =
    authorization.applicationUser.id;

  try {
    const deleteResult =
      await prisma.trip.updateMany({
        where: {
          id: tripId,
          ownerUserId: userId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

    if (deleteResult.count !== 1) {
      return errorResponse(
        404,
        "TRIP_NOT_FOUND",
        "Không tìm thấy chuyến đi thuộc tài khoản của bạn.",
      );
    }

    revalidatePath(
      "/chuyen-di-cua-toi",
    );

    return NextResponse.json({
      ok: true,
      tripId,
    });
  } catch (error) {
    console.error(
      "Trip soft delete failed:",
      error,
    );

    return errorResponse(
      500,
      "TRIP_DELETE_FAILED",
      "Không thể xóa chuyến đi. Vui lòng thử lại.",
    );
  }
}
