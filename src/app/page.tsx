import Link from "next/link";

import { TripPlannerLauncher } from "@/components/home/trip-planner-launcher";
import { SocialComposerLauncher } from "@/components/social/social-composer-launcher";
import { SocialFeed } from "@/components/social/social-feed";
import { getPublicSocialFeed } from "@/lib/social-feed/public-feed";

export const dynamic = "force-dynamic";

function getVietnamCurrentMonth(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date()),
  );
}

export default async function Home() {
  const currentMonth = getVietnamCurrentMonth();
  const feed = await getPublicSocialFeed(currentMonth);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.15),transparent_35%)]" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-xl font-black tracking-tight text-white"
            >
              VTripPlanner
            </Link>

            <nav className="flex items-center gap-2 text-sm font-bold">
              <a
                href="#cong-dong"
                className="hidden rounded-xl px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Cộng đồng
              </a>
              <Link
                href="/dang-nhap"
                className="rounded-xl border border-white/20 px-4 py-2.5 text-white transition hover:bg-white/10"
              >
                Đăng nhập
              </Link>
              <Link
                href="/tai-khoan"
                className="hidden rounded-xl bg-white px-4 py-2.5 text-slate-950 transition hover:bg-emerald-50 sm:inline-flex"
              >
                Tài khoản
              </Link>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3.5 py-2 text-xs font-extrabold text-emerald-100">
              <span aria-hidden="true">●</span>
              Trip Planner + cộng đồng du lịch
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Lên chuyến đi của bạn.
              <span className="block text-emerald-300">
                Rồi khám phá cảm hứng từ cộng đồng.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              VTripPlanner giúp bạn bắt đầu một lịch trình khi cần, còn những
              câu chuyện, cảnh đẹp và gợi ý đúng mùa sẽ chờ ở ngay phía dưới.
            </p>

            <div className="mt-8">
              <TripPlannerLauncher />
            </div>
          </div>
        </div>
      </section>

      <section
        id="cong-dong"
        className="scroll-mt-6 border-t border-slate-200 bg-slate-100/70"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,680px)_minmax(220px,0.45fr)] lg:px-8 lg:py-16">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                VTripPlanner Social
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight">
                Một feed dành riêng cho chuyến đi
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bài chia sẻ của cộng đồng, gợi ý đúng mùa và nội dung du lịch
                nổi bật cùng xuất hiện trong một luồng.
              </p>

              <div className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
                <p>🌿 Gợi ý tháng {feed.currentMonth}</p>
                <p>📷 Chia sẻ chuyến đi</p>
                <p>📍 Cảm hứng từ các địa điểm</p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                Cộng đồng du lịch
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
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
              <SocialFeed
                currentMonth={feed.currentMonth}
                posts={feed.posts}
              />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Đang đúng mùa
                </p>
                <p className="mt-2 text-lg font-black">
                  Tháng {feed.currentMonth}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Những bài có gắn tháng hiện tại được tự động đưa vào feed.
                  Bài evergreen vẫn có thể xuất hiện quanh năm.
                </p>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-sm">
                <p className="text-sm font-black">
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
          <p className="font-bold text-slate-700">VTripPlanner</p>
          <p>Lập lịch trình và chia sẻ cảm hứng du lịch trong cùng một nơi.</p>
        </div>
      </footer>
    </main>
  );
}
