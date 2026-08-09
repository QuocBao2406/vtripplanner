import type { Metadata } from "next";
import Link from "next/link";

import { TripDraftEditor } from "@/components/trip-planner/trip-draft-editor";

export const metadata: Metadata = {
  title: "Tùy chỉnh lịch trình | VTripPlanner",
  description:
    "Chỉnh draft lịch trình trước khi xác nhận lưu chuyến đi trên VTripPlanner.",
};

export default function CustomizeTripPlanPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-black tracking-tight text-slate-950"
          >
            VTripPlanner
          </Link>
          <Link
            href="/chuyen-di-cua-toi"
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Chuyến đi của tôi
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/lap-lich-trinh"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
        >
          ← Quay lại Trip Planner
        </Link>

        <div className="mt-4 max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Editable Draft Itinerary
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Tùy chỉnh lịch trình trước khi lưu
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Dùng ↑/↓ để đổi thứ tự trong cùng ngày, thay hoặc xóa địa điểm và
            thêm điểm mới vào khung còn trống. Chặng di chuyển đầu chuyến là
            activity hệ thống nên không chỉnh sửa. Chỉ khi xác nhận lưu thì
            backend mới tạo Trip READY từ đúng draft này.
          </p>
        </div>

        <div className="mt-7">
          <TripDraftEditor />
        </div>
      </div>
    </main>
  );
}
