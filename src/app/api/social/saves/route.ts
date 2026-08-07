import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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
        "Vui lòng đăng nhập để lưu bài viết.",
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
        "Tài khoản chưa sẵn sàng để lưu bài viết.",
      ),
    };
  }

  return {
    ok: true as const,
    applicationUser,
  };
}

async function readPostId(
  request: Request,
): Promise<
  | {
      ok: true;
      postId: string;
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
    payload === null ||
    !("postId" in payload) ||
    typeof payload.postId !== "string"
  ) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_SAVE_REQUEST",
        "Dữ liệu lưu bài viết không hợp lệ.",
      ),
    };
  }

  const postId = payload.postId.trim();

  if (!UUID_PATTERN.test(postId)) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "INVALID_POST_ID",
        "Bài viết không hợp lệ.",
      ),
    };
  }

  return {
    ok: true,
    postId,
  };
}

function revalidateSocialPaths() {
  revalidatePath("/");
  revalidatePath("/bai-viet-da-luu");
  revalidatePath("/bai-viet-cua-toi");
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = await readPostId(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  const userId =
    authorization.applicationUser.id;
  const { postId } = parsed;

  try {
    const post =
      await prisma.travelPost.findFirst({
        where: {
          id: postId,
          status: "PUBLISHED",
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

    if (!post) {
      return errorResponse(
        404,
        "POST_NOT_FOUND",
        "Bài viết không còn khả dụng để lưu.",
      );
    }

    await prisma.travelPostSave.upsert({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      update: {},
      create: {
        postId,
        userId,
      },
    });

    revalidateSocialPaths();

    return NextResponse.json({
      ok: true,
      saved: true,
      postId,
    });
  } catch (error) {
    console.error(
      "Travel post save failed:",
      error,
    );

    return errorResponse(
      500,
      "POST_SAVE_FAILED",
      "Không thể lưu bài viết. Vui lòng thử lại.",
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

  const parsed = await readPostId(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  const userId =
    authorization.applicationUser.id;
  const { postId } = parsed;

  try {
    await prisma.travelPostSave.deleteMany({
      where: {
        postId,
        userId,
      },
    });

    revalidateSocialPaths();

    return NextResponse.json({
      ok: true,
      saved: false,
      postId,
    });
  } catch (error) {
    console.error(
      "Travel post unsave failed:",
      error,
    );

    return errorResponse(
      500,
      "POST_UNSAVE_FAILED",
      "Không thể bỏ lưu bài viết. Vui lòng thử lại.",
    );
  }
}
