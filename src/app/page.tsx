import Link from "next/link";

import { HomeAccountNav } from "@/components/home/home-account-nav";
import { TripPlannerLauncher } from "@/components/home/trip-planner-launcher";
import { SocialComposerLauncher } from "@/components/social/social-composer-launcher";
import { SocialInfiniteFeed } from "@/components/social/social-infinite-feed";
import { SocialNotificationBell } from "@/components/social/social-notification-bell";
import {
  getPublicSocialFeed,
  getPublicSocialFeedPostById,
} from "@/lib/social-feed/public-feed";

export const dynamic = "force-dynamic";

function getVietnamCurrentMonth(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date()),
  );
}

type HomeSearchParams = Promise<
  Record<
    string,
    string | string[] | undefined
  >
>;

function getSingleSearchParam(
  value:
    | string
    | string[]
    | undefined,
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  const currentMonth =
    getVietnamCurrentMonth();
  const resolvedSearchParams =
    await searchParams;
  const focusPostId =
    getSingleSearchParam(
      resolvedSearchParams.focusPost,
    );

  const [feed, focusedPost] =
    await Promise.all([
      getPublicSocialFeed(
        currentMonth,
      ),
      focusPostId
        ? getPublicSocialFeedPostById(
            currentMonth,
            focusPostId,
          )
        : Promise.resolve(null),
    ]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("/images/vtripplanner-hero-tuyen-lam.jpg")',
          }}
        />
        <div className="absolute inset-0 bg-slate-950/42" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(2,6,23,0.66)_45%,rgba(2,6,23,0.28)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_30%)]" />

        <header className="relative z-50 border-b border-white/15 bg-slate-950/20 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
            <Link
              href="/"
              className="shrink-0 text-lg font-bold tracking-tight text-white sm:text-xl"
            >
              VTripPlanner
            </Link>

            <nav className="flex min-w-0 items-center gap-1 text-sm font-medium sm:gap-2">
              <a
                href="#cong-dong"
                className="hidden rounded-xl px-3 py-2 text-slate-100 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Cộng đồng
              </a>
              <SocialNotificationBell />
              <HomeAccountNav />
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[76svh] max-w-7xl items-center px-4 py-12 sm:min-h-[88vh] sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-950/30 px-3.5 py-2 text-xs font-semibold tracking-[0.12em] text-emerald-50 backdrop-blur">
              <span aria-hidden="true">●</span>
              TRIP PLANNER + CỘNG ĐỒNG DU LỊCH
            </div>

            <h1 className="mt-6 max-w-4xl text-[2.35rem] font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
              Lên chuyến đi của bạn.
              <span className="mt-2 block text-emerald-300">
                Rồi khám phá cảm hứng từ cộng đồng.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-100 sm:text-lg">
              VTripPlanner giúp bạn bắt đầu một lịch trình khi cần, còn những
              câu chuyện, cảnh đẹp và gợi ý đúng mùa sẽ chờ ở ngay phía dưới.
            </p>

            <div className="mt-8">
              <TripPlannerLauncher />
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-slate-100">
              <div>
                <p className="font-semibold text-white">Khởi tạo nhanh</p>
                <p className="mt-1 text-slate-200">
                  Chỉ bấm nút khi bạn thực sự muốn tạo trip.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Feed đúng mùa</p>
                <p className="mt-1 text-slate-200">
                  Nội dung tháng {feed.currentMonth} được tự đưa lên trang chủ.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-5 z-10 hidden rounded-full bg-slate-950/35 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur sm:block">
          Hồ Tuyền Lâm · Đà Lạt
        </div>
      </section>

      <section
        id="cong-dong"
        className="scroll-mt-6 border-t border-slate-200 bg-slate-100/70"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-3 py-8 sm:gap-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,680px)_minmax(220px,0.45fr)] lg:px-8 lg:py-16">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                VTripPlanner Social
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                Một feed dành riêng cho chuyến đi
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bài chia sẻ của cộng đồng, gợi ý đúng mùa và nội dung du lịch
                nổi bật cùng xuất hiện trong một luồng.
              </p>

              <div className="mt-5 space-y-3 text-sm font-medium text-slate-600">
                <p>🌿 Gợi ý tháng {feed.currentMonth}</p>
                <p>📷 Chia sẻ chuyến đi</p>
                <p>📍 Cảm hứng từ các địa điểm</p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Cộng đồng du lịch
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-4xl">
                Chuyến đi, câu chuyện và gợi ý cho tháng {feed.currentMonth}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Bạn không cần vào một trang tìm kiếm địa điểm. Feed chủ động
                đưa những nội dung phù hợp mùa hiện tại và các bài chia sẻ từ
                cộng đồng đến ngay trên trang chủ.
              </p>
            </div>

            <SocialComposerLauncher />

            <div className="mt-5">
              <SocialInfiniteFeed
                key={feed.sessionKey}
                currentMonth={feed.currentMonth}
                snapshotAt={feed.sessionKey}
                focusedPost={focusedPost}
                initialPosts={feed.posts}
                initialCursor={feed.nextCursor}
                initialHasMore={feed.hasMore}
              />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Đang đúng mùa
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  Tháng {feed.currentMonth}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Những bài có gắn tháng hiện tại được tự động đưa vào feed.
                  Bài evergreen vẫn có thể xuất hiện quanh năm.
                </p>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-sm">
                <p className="text-sm font-semibold">
                  Reaction sẽ giúp lịch trình hiểu bạn hơn
                </p>
                <p className="mt-2 text-xs leading-6 text-emerald-50">
                  Khi chức năng reaction được nối ở bước sau, bài bạn quan tâm
                  sẽ trở thành tín hiệu về địa điểm và thời điểm cho Trip
                  Planner.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-7 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="font-semibold text-slate-700">VTripPlanner</p>
          <p>Lập lịch trình và chia sẻ cảm hứng du lịch trong cùng một nơi.</p>
        </div>
      </footer>
    </main>
  );
}
