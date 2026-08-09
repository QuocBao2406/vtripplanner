
import type { Metadata } from "next";
import Link from "next/link";

import { TripPlannerLauncher } from "@/components/home/trip-planner-launcher";

export const metadata: Metadata = {
  title: "Lập lịch trình | VTripPlanner",
  description:
    "Tạo lịch trình du lịch từ dữ liệu địa điểm và tín hiệu sở thích trên VTripPlanner.",
};

export default function TripPlannerPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-black tracking-tight text-white"
          >
            VTripPlanner
          </Link>

          <Link
            href="/chuyen-di-cua-toi"
            className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
          >
            Chuyến đi của tôi
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_58%,#064e3b_100%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-slate-300 transition hover:text-emerald-300"
          >
            ← Trở về trang chủ
          </Link>

          <div className="mt-5 max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              VTripPlanner Trip Planner
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl">
              Lập lịch trình cho chuyến đi của bạn
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Chọn điểm đến, ngày đi, thời lượng, mức ngân sách và sở thích.
              Hệ thống sẽ xếp lịch từ dữ liệu nội bộ hiện có và dùng tín hiệu
              reaction hoặc bài đã lưu để cá nhân hóa khi phù hợp.
            </p>
          </div>

          <div className="mt-8">
            <TripPlannerLauncher pageMode />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs leading-6 text-slate-400 sm:px-6 lg:px-8">
          Lịch trình preview chỉ được lưu khi bạn chủ động bấm “Lưu chuyến đi”.
          Bước này giữ nguyên engine hiện tại; điểm xuất phát, giờ khởi hành,
          phương tiện và ngân sách tiền thực tế sẽ được bổ sung ở các bước sau.
        </div>
      </footer>
    </main>
  );
}
