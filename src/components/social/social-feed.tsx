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

function getInitial(name: string): string {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toLocaleUpperCase("vi-VN") : "V";
}

function PostAvatar({ post }: { post: PublicSocialFeedPost }) {
  if (post.sourceAvatarUrl) {
    return (
      <div
        role="img"
        aria-label={`Ảnh đại diện của ${post.sourceName}`}
        className="size-11 shrink-0 rounded-full bg-cover bg-center shadow-sm"
        style={{ backgroundImage: `url("${post.sourceAvatarUrl}")` }}
      />
    );
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-semibold text-white shadow-sm">
      {getInitial(post.sourceName)}
    </div>
  );
}

function PostMedia({ post }: { post: PublicSocialFeedPost }) {
  if (!post.coverImageUrl) {
    return null;
  }

  if (post.mediaType === "VIDEO") {
    return (
      <div className="border-y border-slate-100 bg-slate-950">
        <video
          controls
          preload="metadata"
          className="mx-auto max-h-[620px] w-full object-contain"
          aria-label={post.coverImageAlt}
        >
          <source
            src={post.coverImageUrl}
            type={post.mediaMimeType ?? undefined}
          />
          Trình duyệt của bạn chưa hỗ trợ phát video.
        </video>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={post.coverImageAlt}
      className="aspect-[16/10] w-full bg-slate-100 bg-cover bg-center"
      style={{
        backgroundImage: `url("${post.coverImageUrl}")`,
      }}
    />
  );
}

export function SocialFeed({
  currentMonth,
  posts,
}: SocialFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-800">
          Feed tháng {currentMonth} đang chờ những chuyến đi đầu tiên.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Các bài chia sẻ và gợi ý phù hợp sẽ xuất hiện tại đây.
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
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <PostAvatar post={post} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-slate-950">
                  {post.sourceName}
                </p>

                {post.isSystemPost ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    VTripPlanner
                  </span>
                ) : null}
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span>{formatPublishedAt(post.publishedAt)}</span>
                <span aria-hidden="true">·</span>
                <span>{TYPE_LABELS[post.type]}</span>
              </div>
            </div>
          </div>

          {(post.headline || post.caption) ? (
            <div className="px-4 pb-4 sm:px-5">
              {post.headline ? (
                <h3 className="text-lg font-semibold leading-7 text-slate-950 sm:text-xl">
                  {post.headline}
                </h3>
              ) : null}

              {post.caption ? (
                <p
                  className={`whitespace-pre-wrap text-sm leading-7 text-slate-700 ${
                    post.headline ? "mt-2" : ""
                  }`}
                >
                  {post.caption}
                </p>
              ) : null}
            </div>
          ) : null}

          <PostMedia post={post} />

          {post.places.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-4 pt-4 sm:px-5">
              {post.places.map((place) => (
                <span
                  key={place.id}
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
                >
                  📍 {place.name}
                  <span className="text-emerald-600">
                    {" "}
                    · {place.provinceName}
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          <div className="px-4 pt-4 sm:px-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-500">
              <span>
                {post.reactionCount > 0
                  ? `💚 ${post.reactionCount}`
                  : "Chưa có reaction"}
              </span>
              <span>
                {post.commentCount > 0
                  ? `${post.commentCount} bình luận`
                  : "Chưa có bình luận"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 py-2">
              <button
                type="button"
                disabled
                title="Reaction sẽ được kết nối ở bước tiếp theo"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600"
              >
                🤍 Thích
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
