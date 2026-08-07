import type { PublicSocialFeedPost } from "@/lib/social-feed/public-feed";

type SocialFeedProps = {
  currentMonth: number;
  posts: PublicSocialFeedPost[];
};

const TYPE_LABELS: Record<PublicSocialFeedPost["type"], string> = {
  USER_TRIP: "Chia sẻ chuyến đi",
  SEASONAL_GUIDE: "Gợi ý theo mùa",
  EVERGREEN_GUIDE: "Khám phá địa điểm",
  PROMOTED: "Nổi bật",
};

function formatPublishedAt(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

function SystemAvatar() {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-sm font-semibold text-white shadow-sm">
      V
    </div>
  );
}

export function SocialFeed({ currentMonth, posts }: SocialFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-semibold text-slate-800">
          Feed tháng {currentMonth} đang được cập nhật.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Các bài chia sẻ mới sẽ xuất hiện tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {posts.map((post) => (
        <article
          key={post.id}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {post.sourceAvatarUrl ? (
                  <div
                    role="img"
                    aria-label={`Ảnh đại diện ${post.sourceName}`}
                    className="size-11 shrink-0 rounded-full bg-slate-200 bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${post.sourceAvatarUrl}")`,
                    }}
                  />
                ) : (
                  <SystemAvatar />
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {post.sourceName}
                    </p>
                    {post.isSystemPost ? (
                      <span
                        title="Bài đăng từ VTripPlanner"
                        className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-medium text-white"
                      >
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs font-normal text-slate-500">
                    {formatPublishedAt(post.publishedAt)} ·{" "}
                    {TYPE_LABELS[post.type]}
                  </p>
                </div>
              </div>

              {post.type === "PROMOTED" ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
                  Được quảng bá
                </span>
              ) : post.type === "SEASONAL_GUIDE" ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800">
                  Tháng {currentMonth}
                </span>
              ) : null}
            </div>

            {post.headline ? (
              <h3 className="mt-5 text-2xl font-bold leading-snug tracking-[-0.02em] text-slate-950">
                {post.headline}
              </h3>
            ) : null}

            {post.caption ? (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-700">
                {post.caption}
              </p>
            ) : null}

            {post.places.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.places.map((place) => (
                  <span
                    key={place.id}
                    title={place.provinceName}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    📍 {place.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {post.coverImageUrl ? (
            <div
              role="img"
              aria-label={post.coverImageAlt}
              className="aspect-[16/10] w-full bg-slate-100 bg-cover bg-center sm:aspect-[16/9]"
              style={{
                backgroundImage: `url("${post.coverImageUrl}")`,
              }}
            />
          ) : (
            <div className="flex aspect-[16/8] items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 px-6 text-center text-sm font-normal text-emerald-800">
              Hình ảnh chuyến đi đang được cập nhật
            </div>
          )}

          <div className="px-5 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-4 text-xs font-normal text-slate-500">
              <span>
                {post.reactionCount > 0
                  ? `❤️ ${post.reactionCount}`
                  : "Chưa có reaction"}
              </span>
              <span>{post.commentCount} bình luận</span>
            </div>

            <div className="mt-3 grid grid-cols-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                disabled
                title="Reaction sẽ được kết nối ở bước tiếp theo"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600"
              >
                ♡ Reaction
              </button>
              <button
                type="button"
                disabled
                title="Comment sẽ được kết nối ở bước tiếp theo"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600"
              >
                💬 Bình luận
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
