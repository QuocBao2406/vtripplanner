import { NextResponse } from "next/server";

import {
  getPublicSocialFeedPage,
  InvalidSocialFeedCursorError,
  SOCIAL_FEED_BATCH_SIZE,
} from "@/lib/social-feed/public-feed";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
) {
  const url = new URL(request.url);
  const month = Number(
    url.searchParams.get("month"),
  );
  const cursor =
    url.searchParams.get("cursor");

  if (!cursor) {
    return NextResponse.json(
      {
        ok: false,
        code: "CURSOR_REQUIRED",
        message:
          "Thiếu cursor để tải thêm feed.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const feed =
      await getPublicSocialFeedPage(
        month,
        {
          cursor,
          limit:
            SOCIAL_FEED_BATCH_SIZE,
        },
      );

    return NextResponse.json(
      {
        ok: true,
        currentMonth:
          feed.currentMonth,
        posts: feed.posts,
        hasMore: feed.hasMore,
        nextCursor:
          feed.nextCursor,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof
      InvalidSocialFeedCursorError
    ) {
      return NextResponse.json(
        {
          ok: false,
          code:
            "INVALID_FEED_CURSOR",
          message:
            "Phiên tải feed không còn hợp lệ. Hãy tải lại trang.",
        },
        {
          status: 400,
        },
      );
    }

    console.error(
      "GET /api/social/feed failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        code:
          "SOCIAL_FEED_LOAD_FAILED",
        message:
          "Chưa thể tải thêm bài viết. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
