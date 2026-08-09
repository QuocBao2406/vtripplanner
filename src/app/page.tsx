import Link from "next/link";

import { HomeAccountNav } from "@/components/home/home-account-nav";
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
              <Link
                href="/lap-lich-trinh"
                className="hidden rounded-xl px-3 py-2 text-slate-100 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Lập lịch
              </Link>
              <a
                href="#cong-dong"
                className="hidden rounded-xl px-3 py-2 text-slate-100 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Cộng đồng
              </a>
              <Link
                href="/uu-dai"
                className="hidden rounded-xl px-3 py-2 text-slate-100 transition hover:bg-white/10 hover:text-white md:inline-flex"
              >
                Ưu đãi
              </Link>
              <SocialNotificationBell />
              <HomeAccountNav />
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[460px] max-w-7xl items-center px-4 py-10 sm:min-h-[500px] sm:px-6 sm:py-12 lg:min-h-[530px] lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-950/30 px-3.5 py-2 text-xs font-semibold tracking-[0.12em] text-emerald-50 backdrop-blur">
              <span aria-hidden="true">●</span>
              TRIP PLANNER + CỘNG ĐỒNG DU LỊCH
            </div>

            <h1 className="mt-5 max-w-3xl text-[2.3rem] font-bold leading-[1.06] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.75rem]">
              Lên kế hoạch cho chuyến đi tiếp theo.
              <span className="mt-2 block text-emerald-300">
                Và tìm cảm hứng từ cộng đồng.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg sm:leading-8">
              Khám phá điểm đến, cá nhân hóa lịch trình theo sở thích, thời gian
              và ngân sách. Khi muốn thêm cảm hứng, cộng đồng du lịch nằm ngay
              phía dưới.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/lap-lich-trinh"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-400 sm:w-auto"
              >
                ✈ Tạo chuyến đi
              </Link>

              <a
                href="#cong-dong"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
              >
                Xem cộng đồng ↓
              </a>
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
        <div className="mx-auto max-w-[760px] px-3 py-7 sm:px-6 sm:py-9 lg:px-0 lg:py-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Cộng đồng du lịch
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-3xl">
              Chuyến đi và cảm hứng tháng {feed.currentMonth}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Chia sẻ hành trình của bạn hoặc xem những câu chuyện, địa điểm và
              gợi ý theo mùa từ cộng đồng VTripPlanner.
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
