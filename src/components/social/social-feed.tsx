import { SocialPostMediaGallery } from "@/components/social/social-post-media-gallery";
import { SocialPostActions } from "@/components/social/social-post-actions";
import { SocialPostOwnerActions } from "@/components/social/social-post-owner-actions";
import type { PublicSocialFeedPost } from "@/lib/social-feed/public-feed";

type SocialFeedProps = {
  currentMonth: number;
  posts: PublicSocialFeedPost[];
  focusedPostId?: string | null;
};

const TYPE_LABELS: Record<
  PublicSocialFeedPost["type"],
  string
> = {
  USER_TRIP: "Chia sẻ chuyến đi",
  SEASONAL_GUIDE: "Gợi ý theo mùa",
  EVERGREEN_GUIDE: "Khám phá địa điểm",
  PROMOTED: "Nổi bật",
};

function formatPublishedAt(
  value: Date,
): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

function getInitial(name: string): string {
  const normalized = name.trim();
  return normalized
    ? normalized
        .charAt(0)
        .toLocaleUpperCase("vi-VN")
    : "V";
}

function PostAvatar({
  post,
}: {
  post: PublicSocialFeedPost;
}) {
  if (post.sourceAvatarUrl) {
    return (
      <div
        role="img"
        aria-label={`Ảnh đại diện của ${post.sourceName}`}
        className="size-11 shrink-0 rounded-full bg-cover bg-center shadow-sm"
        style={{
          backgroundImage: `url("${post.sourceAvatarUrl}")`,
        }}
      />
    );
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-semibold text-white shadow-sm">
      {getInitial(post.sourceName)}
    </div>
  );
}

function TripSummaryCard({
  post,
}: {
  post: PublicSocialFeedPost;
}) {
  if (!post.sourceTrip) {
    return null;
  }

  const trip = post.sourceTrip;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 sm:mx-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white shadow-sm">
          🧳
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Lịch trình VTripPlanner
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {trip.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {trip.destinationName ??
              "Điểm đến chưa xác định"}
            {" · "}
            {trip.dayCount} ngày
            {" · "}
            {trip.placeCount} địa điểm
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Chỉ hiển thị tóm tắt, không công khai ngày giờ hay lịch trình chi tiết.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SocialFeed({
  currentMonth,
  posts,
  focusedPostId = null,
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
          id={`post-${post.id}`}
          className={`scroll-mt-24 overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
            post.id === focusedPostId
              ? "border-emerald-300 ring-2 ring-emerald-300 ring-offset-2"
              : "border-slate-200"
          }`}
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
                <span>
                  {formatPublishedAt(
                    post.publishedAt,
                  )}
                </span>
                <span aria-hidden="true">
                  ·
                </span>
                <span>
                  {TYPE_LABELS[post.type]}
                </span>
              </div>
            </div>

            {post.viewerCanManage ? (
              <SocialPostOwnerActions
                postId={post.id}
                initialCaption={
                  post.caption ?? ""
                }
              />
            ) : null}
          </div>

          {post.headline || post.caption ? (
            <div className="px-4 pb-4 sm:px-5">
              {post.headline ? (
                <h3 className="text-lg font-semibold leading-7 text-slate-950 sm:text-xl">
                  {post.headline}
                </h3>
              ) : null}

              {post.caption ? (
                <p
                  className={`whitespace-pre-wrap text-sm leading-7 text-slate-700 ${
                    post.headline
                      ? "mt-2"
                      : ""
                  }`}
                >
                  {post.caption}
                </p>
              ) : null}
            </div>
          ) : null}

          <SocialPostMediaGallery
            media={post.media}
          />

          <TripSummaryCard post={post} />

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

          <SocialPostActions
            postId={post.id}
            initialReactionCount={
              post.reactionCount
            }
            initialViewerReaction={
              post.viewerReaction
            }
            initialViewerSaved={
              post.viewerSaved
            }
            commentCount={
              post.commentCount
            }
          />
        </article>
      ))}
    </div>
  );
}
