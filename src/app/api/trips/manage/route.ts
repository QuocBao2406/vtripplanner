import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

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

  const tripIdError =
    validateTripId(tripId);

  if (tripIdError) {
    return tripIdError;
  }

  if (!title) {
    return errorResponse(
      400,
      "TITLE_REQUIRED",
      "Tên chuyến đi không được để trống.",
    );
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return errorResponse(
      400,
      "TITLE_TOO_LONG",
      `Tên chuyến đi tối đa ${MAX_TITLE_LENGTH} ký tự.`,
    );
  }

  const userId =
    authorization.applicationUser.id;

  try {
    const updateResult =
      await prisma.trip.updateMany({
        where: {
          id: tripId,
          ownerUserId: userId,
          deletedAt: null,
        },
        data: {
          title,
        },
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
        title,
      },
    });
  } catch (error) {
    console.error(
      "Trip rename failed:",
      error,
    );

    return errorResponse(
      500,
      "TRIP_RENAME_FAILED",
      "Không thể đổi tên chuyến đi. Vui lòng thử lại.",
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
