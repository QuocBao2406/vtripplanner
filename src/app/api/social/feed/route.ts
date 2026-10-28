import { NextResponse } from "next/server";

import {
  getPublicSocialFeedPage,
  InvalidSocialFeedCursorError,
  SOCIAL_FEED_BATCH_SIZE,
} from "@/lib/social-feed/public-feed";
import { FALLBACK_SOCIAL_POSTS } from "@/lib/social-feed/fallback-posts";

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
        currentMonth: Number.isFinite(month) && month >= 1 && month <= 12 ? month : 8,
        posts: FALLBACK_SOCIAL_POSTS,
        hasMore: false,
        nextCursor: null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
