"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { SocialFeed } from "@/components/social/social-feed";
import type { PublicSocialFeedPost } from "@/lib/social-feed/public-feed";

type SocialInfiniteFeedProps = {
  currentMonth: number;
  snapshotAt: string;
  focusedPost:
    PublicSocialFeedPost | null;
  initialPosts:
    PublicSocialFeedPost[];
  initialCursor: string | null;
  initialHasMore: boolean;
};

const NEW_POST_POLL_INTERVAL_MS =
  60_000;

type FeedApiPost =
  Omit<
    PublicSocialFeedPost,
    "publishedAt"
  > & {
    publishedAt: string;
  };

type FeedApiSuccess = {
  ok: true;
  currentMonth: number;
  posts: FeedApiPost[];
  hasMore: boolean;
  nextCursor: string | null;
};

type FeedApiFailure = {
  ok: false;
  code?: string;
  message?: string;
};

type FeedApiResponse =
  | FeedApiSuccess
  | FeedApiFailure;

type FeedUpdatesApiResponse = {
  ok: boolean;
  hasNewPosts?: boolean;
};

function hydrateApiPost(
  post: FeedApiPost,
): PublicSocialFeedPost {
  const publishedAt =
    new Date(post.publishedAt);

  if (
    Number.isNaN(
      publishedAt.getTime(),
    )
  ) {
    throw new Error(
      "INVALID_PUBLISHED_AT",
    );
  }

  return {
    ...post,
    publishedAt,
  };
}

export function SocialInfiniteFeed({
  currentMonth,
  snapshotAt,
  focusedPost,
  initialPosts,
  initialCursor,
  initialHasMore,
}: SocialInfiniteFeedProps) {
  const [posts, setPosts] =
    useState(() => {
      if (!focusedPost) {
        return initialPosts;
      }

      return [
        focusedPost,
        ...initialPosts.filter(
          (post) =>
            post.id !==
            focusedPost.id,
        ),
      ];
    });
  const [cursor, setCursor] =
    useState(initialCursor);
  const [hasMore, setHasMore] =
    useState(
      initialHasMore &&
        initialCursor !== null,
    );
  const [isLoading, setIsLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const sentinelRef =
    useRef<HTMLDivElement | null>(
      null,
    );
  const requestInFlightRef =
    useRef(false);
  const updateCheckInFlightRef =
    useRef(false);
  const [hasNewPosts, setHasNewPosts] =
    useState(false);

  const checkForNewPosts =
    useCallback(async () => {
      if (
        hasNewPosts ||
        updateCheckInFlightRef.current ||
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      updateCheckInFlightRef.current =
        true;

      try {
        const searchParams =
          new URLSearchParams({
            month:
              String(currentMonth),
            snapshotAt,
          });
        const response = await fetch(
          `/api/social/feed/updates?${searchParams.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const payload =
          (await response.json()) as
            FeedUpdatesApiResponse;

        if (
          response.ok &&
          payload.ok &&
          payload.hasNewPosts
        ) {
          setHasNewPosts(true);
        }
      } catch (error) {
        console.error(
          "Social feed update check failed",
          error,
        );
      } finally {
        updateCheckInFlightRef.current =
          false;
      }
    }, [
      currentMonth,
      hasNewPosts,
      snapshotAt,
    ]);

  const refreshToNewSnapshot =
    useCallback(() => {
      window.history.replaceState(
        null,
        "",
        "/#cong-dong",
      );
      window.location.reload();
    }, []);

  const loadMore = useCallback(
    async () => {
      if (
        requestInFlightRef.current ||
        !hasMore ||
        !cursor
      ) {
        return;
      }

      requestInFlightRef.current = true;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const searchParams =
          new URLSearchParams({
            month:
              String(currentMonth),
            cursor,
          });
        const response = await fetch(
          `/api/social/feed?${searchParams.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const payload =
          (await response.json()) as
            FeedApiResponse;

        if (
          !response.ok ||
          !payload.ok
        ) {
          throw new Error(
            payload.ok
              ? "SOCIAL_FEED_LOAD_FAILED"
              : (
                  payload.message ??
                  "Chưa thể tải thêm bài viết."
                ),
          );
        }

        const nextPosts =
          payload.posts.map(
            hydrateApiPost,
          );

        setPosts(
          (currentPosts) => {
            const existingIds =
              new Set(
                currentPosts.map(
                  (post) => post.id,
                ),
              );
            const uniqueNextPosts =
              nextPosts.filter(
                (post) =>
                  !existingIds.has(
                    post.id,
                  ),
              );

            return [
              ...currentPosts,
              ...uniqueNextPosts,
            ];
          },
        );
        setCursor(
          payload.nextCursor,
        );
        setHasMore(
          payload.hasMore &&
            payload.nextCursor !==
              null,
        );
      } catch (error) {
        console.error(
          "Infinite social feed load failed",
          error,
        );

        setErrorMessage(
          error instanceof Error &&
            error.message !==
              "SOCIAL_FEED_LOAD_FAILED"
            ? error.message
            : "Chưa thể tải thêm bài viết. Vui lòng thử lại.",
        );
      } finally {
        requestInFlightRef.current =
          false;
        setIsLoading(false);
      }
    },
    [
      currentMonth,
      cursor,
      hasMore,
    ],
  );

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        void checkForNewPosts();
      }, NEW_POST_POLL_INTERVAL_MS);

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void checkForNewPosts();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [checkForNewPosts]);

  useEffect(() => {
    const sentinel =
      sentinelRef.current;

    if (
      !sentinel ||
      !hasMore ||
      !cursor ||
      errorMessage
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries.some(
              (entry) =>
                entry.isIntersecting,
            )
          ) {
            void loadMore();
          }
        },
        {
          rootMargin:
            "700px 0px",
        },
      );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    cursor,
    errorMessage,
    hasMore,
    loadMore,
  ]);

  return (
    <div>
      {hasNewPosts ? (
        <div
          className="sticky top-3 z-20 mb-4 flex justify-center"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={
              refreshToNewSnapshot
            }
            className="rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-lg transition hover:bg-emerald-50"
          >
            ✨ Có bài viết mới · Xem ngay
          </button>
        </div>
      ) : null}

      <SocialFeed
        currentMonth={currentMonth}
        posts={posts}
        focusedPostId={
          focusedPost?.id ?? null
        }
      />

      <div
        ref={sentinelRef}
        className="flex min-h-28 items-center justify-center py-5"
        aria-live="polite"
      >
        {isLoading ? (
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
            />
            Đang tải thêm chuyến đi...
          </div>
        ) : errorMessage ? (
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm text-amber-900">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                void loadMore();
              }}
              className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100"
            >
              Thử tải lại
            </button>
          </div>
        ) : hasMore ? (
          <p className="text-xs text-slate-400">
            Kéo xuống để xem thêm
          </p>
        ) : posts.length > 0 ? (
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
            Bạn đã xem hết các bài hiện có.
          </div>
        ) : null}
      </div>
    </div>
  );
}
