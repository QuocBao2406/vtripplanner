import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ReactionType = "LIKE" | "LOVE" | "WOW";

const ALLOWED_REACTIONS = new Set<ReactionType>([
  "LIKE",
  "LOVE",
  "WOW",
]);

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
        "Vui lòng đăng nhập để thả cảm xúc.",
      ),
    };
  }

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: authUser.id,
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
        "Tài khoản chưa sẵn sàng để thả cảm xúc.",
      ),
    };
  }

  return {
    ok: true as const,
    applicationUser,
  };
}

async function getPublishedPost(postId: string) {
  return prisma.travelPost.findFirst({
    where: {
      id: postId,
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Không thể đọc dữ liệu reaction.",
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("postId" in payload) ||
    !("type" in payload)
  ) {
    return errorResponse(
      400,
      "INVALID_REACTION",
      "Dữ liệu reaction không hợp lệ.",
    );
  }

  const postId =
    typeof payload.postId === "string"
      ? payload.postId.trim()
      : "";

  const reactionType =
    typeof payload.type === "string"
      ? payload.type.trim().toUpperCase()
      : "";

  if (!UUID_PATTERN.test(postId)) {
    return errorResponse(
      400,
      "INVALID_POST_ID",
      "Bài đăng không hợp lệ.",
    );
  }

  if (!ALLOWED_REACTIONS.has(reactionType as ReactionType)) {
    return errorResponse(
      400,
      "INVALID_REACTION_TYPE",
      "Reaction chỉ hỗ trợ Thích, Yêu thích hoặc Wow.",
    );
  }

  const post = await getPublishedPost(postId);

  if (!post) {
    return errorResponse(
      404,
      "POST_NOT_FOUND",
      "Không tìm thấy bài đăng.",
    );
  }

  const type = reactionType as ReactionType;
  const userId = authorization.applicationUser.id;

  try {
    const reactionCount = await prisma.$transaction(async (transaction) => {
      await transaction.travelPostReaction.upsert({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        update: {
          type,
        },
        create: {
          postId,
          userId,
          type,
        },
      });

      return transaction.travelPostReaction.count({
        where: {
          postId,
        },
      });
    });

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      reactionType: type,
      reactionCount,
    });
  } catch (error) {
    console.error("Travel post reaction upsert failed:", error);

    return errorResponse(
      500,
      "REACTION_SAVE_FAILED",
      "Không thể lưu reaction. Vui lòng thử lại.",
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Không thể đọc dữ liệu reaction.",
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("postId" in payload)
  ) {
    return errorResponse(
      400,
      "INVALID_REACTION",
      "Dữ liệu reaction không hợp lệ.",
    );
  }

  const postId =
    typeof payload.postId === "string"
      ? payload.postId.trim()
      : "";

  if (!UUID_PATTERN.test(postId)) {
    return errorResponse(
      400,
      "INVALID_POST_ID",
      "Bài đăng không hợp lệ.",
    );
  }

  const post = await getPublishedPost(postId);

  if (!post) {
    return errorResponse(
      404,
      "POST_NOT_FOUND",
      "Không tìm thấy bài đăng.",
    );
  }

  const userId = authorization.applicationUser.id;

  try {
    const reactionCount = await prisma.$transaction(async (transaction) => {
      await transaction.travelPostReaction.deleteMany({
        where: {
          postId,
          userId,
        },
      });

      return transaction.travelPostReaction.count({
        where: {
          postId,
        },
      });
    });

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      reactionType: null,
      reactionCount,
    });
  } catch (error) {
    console.error("Travel post reaction delete failed:", error);

    return errorResponse(
      500,
      "REACTION_DELETE_FAILED",
      "Không thể bỏ reaction. Vui lòng thử lại.",
    );
  }
}
