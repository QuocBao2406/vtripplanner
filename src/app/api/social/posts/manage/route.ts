import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  TravelPostStatus,
  TravelPostType,
} from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_CAPTION_LENGTH = 2000;

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
        "Vui lòng đăng nhập để quản lý bài viết.",
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
        "Tài khoản chưa sẵn sàng để quản lý bài viết.",
      ),
    };
  }

  return {
    ok: true as const,
    applicationUser,
  };
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
        "Không thể đọc dữ liệu bài viết.",
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
        "INVALID_POST_REQUEST",
        "Dữ liệu bài viết không hợp lệ.",
      ),
    };
  }

  return {
    ok: true,
    record:
      payload as Record<string, unknown>,
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

function validatePostId(
  postId: string,
): NextResponse | null {
  if (!UUID_PATTERN.test(postId)) {
    return errorResponse(
      400,
      "INVALID_POST_ID",
      "Bài viết không hợp lệ.",
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

  const postId = readString(
    payload.record,
    "postId",
  );
  const caption = readString(
    payload.record,
    "caption",
  );

  const postIdError =
    validatePostId(postId);

  if (postIdError) {
    return postIdError;
  }

  if (!caption) {
    return errorResponse(
      400,
      "CAPTION_REQUIRED",
      "Nội dung bài viết không được để trống.",
    );
  }

  if (
    caption.length >
    MAX_CAPTION_LENGTH
  ) {
    return errorResponse(
      400,
      "CAPTION_TOO_LONG",
      `Nội dung bài viết tối đa ${MAX_CAPTION_LENGTH} ký tự.`,
    );
  }

  const userId =
    authorization.applicationUser.id;

  try {
    const updateResult =
      await prisma.travelPost.updateMany({
        where: {
          id: postId,
          authorUserId: userId,
          type: TravelPostType.USER_TRIP,
          status:
            TravelPostStatus.PUBLISHED,
          deletedAt: null,
        },
        data: {
          caption,
        },
      });

    if (updateResult.count !== 1) {
      return errorResponse(
        404,
        "POST_NOT_FOUND",
        "Không tìm thấy bài viết USER_TRIP thuộc tài khoản của bạn.",
      );
    }

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      post: {
        id: postId,
        caption,
      },
    });
  } catch (error) {
    console.error(
      "Travel post edit failed:",
      error,
    );

    return errorResponse(
      500,
      "POST_EDIT_FAILED",
      "Không thể chỉnh sửa bài viết. Vui lòng thử lại.",
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

  const postId = readString(
    payload.record,
    "postId",
  );

  const postIdError =
    validatePostId(postId);

  if (postIdError) {
    return postIdError;
  }

  const userId =
    authorization.applicationUser.id;

  try {
    const deleteResult =
      await prisma.travelPost.updateMany({
        where: {
          id: postId,
          authorUserId: userId,
          type: TravelPostType.USER_TRIP,
          status:
            TravelPostStatus.PUBLISHED,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

    if (deleteResult.count !== 1) {
      return errorResponse(
        404,
        "POST_NOT_FOUND",
        "Không tìm thấy bài viết USER_TRIP thuộc tài khoản của bạn.",
      );
    }

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      postId,
    });
  } catch (error) {
    console.error(
      "Travel post soft delete failed:",
      error,
    );

    return errorResponse(
      500,
      "POST_DELETE_FAILED",
      "Không thể xóa bài viết. Vui lòng thử lại.",
    );
  }
}
