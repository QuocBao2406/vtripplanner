import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { getMyPublishedSocialPosts } from "@/lib/social-feed/my-posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(): Promise<NextResponse> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return errorResponse(
      401,
      "AUTH_REQUIRED",
      "Vui lòng đăng nhập để xem bài viết của bạn.",
    );
  }

  try {
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
      return NextResponse.json(
        {
          ok: true,
          posts: [],
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const posts =
      await getMyPublishedSocialPosts(
        applicationUser.id,
      );

    return NextResponse.json(
      {
        ok: true,
        posts,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/social/posts/mine failed:",
      error,
    );

    return errorResponse(
      500,
      "MY_POSTS_LOAD_FAILED",
      "Không thể tải bài viết của bạn. Vui lòng thử lại.",
    );
  }
}
