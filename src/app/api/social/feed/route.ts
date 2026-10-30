import { NextResponse } from "next/server";

import {
  getPublicSocialFeedPage,
  InvalidSocialFeedCursorError,
  SOCIAL_FEED_BATCH_SIZE,
} from "@/lib/social-feed/public-feed";
import { FALLBACK_SOCIAL_POSTS } from "@/lib/social-feed/fallback-posts";
import { resolveFeedMonth } from "@/lib/social-feed/current-month";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
) {
  const url = new URL(request.url);
  // Web và mobile phải xếp hạng theo cùng một tháng; thiếu tháng thì dùng giờ Việt Nam.
  const month = resolveFeedMonth(
    url.searchParams.get("month"),
  );
  const cursor =
    url.searchParams.get("cursor");

  try {
    const feed =
      await getPublicSocialFeedPage(
        month,
        {
          cursor: cursor || undefined,
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
        snapshotAt:
          feed.sessionKey,
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

    console.warn(
      "GET /api/social/feed failed, falling back to curated posts:",
      error,
    );

    return NextResponse.json(
      {
        ok: true,
        currentMonth: month,
        posts: FALLBACK_SOCIAL_POSTS,
        hasMore: false,
        nextCursor: null,
        snapshotAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
