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
    {
      status,
    },
  );
}

async function getAuthenticatedApplicationUser() {
  const authUser =
    await getCurrentUser();

  if (!authUser) {
    return {
      ok: false as const,
      response: errorResponse(
        401,
        "AUTH_REQUIRED",
        "Vui lòng đăng nhập để ẩn bài viết.",
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
        "Tài khoản chưa sẵn sàng để ẩn bài viết.",
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
        "INVALID_HIDE_REQUEST",
        "Dữ liệu ẩn bài viết không hợp lệ.",
      ),
    };
  }

  const postId =
    payload.postId.trim();

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

export async function POST(
  request: Request,
): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed =
    await readPostId(request);

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
        "Bài viết không còn khả dụng.",
      );
    }

    await prisma.travelPostHide.upsert({
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

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      hidden: true,
      postId,
    });
  } catch (error) {
    console.error(
      "Travel post hide failed:",
      error,
    );

    return errorResponse(
      500,
      "POST_HIDE_FAILED",
      "Không thể ẩn bài viết. Vui lòng thử lại.",
    );
  }
}
