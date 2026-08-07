"use client";

import { FormEvent, useState } from "react";

const INTEREST_OPTIONS = [
  "Khám phá cảnh đẹp",
  "Ẩm thực",
  "Văn hóa - lịch sử",
  "Nghỉ dưỡng",
  "Trải nghiệm địa phương",
];

export function TripPlannerLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="trip-planner-form"
          onClick={() => {
            setIsOpen((currentValue) => !currentValue);
            setSubmitted(false);
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
        >
          <span aria-hidden="true">✈</span>
          Tạo chuyến đi
        </button>

        <a
          href="#cong-dong"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15"
        >
          Xem cộng đồng
          <span aria-hidden="true">↓</span>
        </a>
      </div>

      {isOpen ? (
        <div
          id="trip-planner-form"
          className="mt-6 overflow-hidden rounded-3xl border border-white/20 bg-white text-left text-slate-950 shadow-2xl shadow-slate-950/20"
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  Lên lịch chuyến đi
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Bạn muốn đi đâu?
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Chỉ nhập thông tin khi bạn thực sự muốn bắt đầu tạo trip.
                </p>
              </div>

              <button
                type="button"
                aria-label="Đóng form tạo chuyến đi"
                onClick={() => {
                  setIsOpen(false);
                  setSubmitted(false);
                }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-black text-slate-500 transition hover:bg-slate-50"
              >
                ×
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Điểm đến hoặc khu vực
                </span>
                <input
                  required
                  name="destination"
                  type="text"
                  placeholder="Ví dụ: Đà Lạt"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Ngày bắt đầu
                </span>
                <input
                  required
                  name="startDate"
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Số ngày
                </span>
                <input
                  required
                  min={1}
                  max={30}
                  defaultValue={3}
                  name="durationDays"
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Ngân sách
                </span>
                <select
                  name="budget"
                  defaultValue="STANDARD"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="ECONOMY">Tiết kiệm</option>
                  <option value="STANDARD">Tiêu chuẩn</option>
                  <option value="PREMIUM">Thoải mái</option>
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-slate-700">
                Bạn thích điều gì trong chuyến đi?
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <label
                    key={interest}
                    className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800"
                  >
                    <input
                      type="checkbox"
                      name="interests"
                      value={interest}
                      className="sr-only"
                    />
                    {interest}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Ở bước hiện tại, form này mới hoàn thiện trải nghiệm nhập liệu.
                Kết nối AI tạo lịch trình sẽ được nối ở bước Trip Planner tiếp theo.
              </p>

              <button
                type="submit"
                className="shrink-0 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Tạo lịch trình
              </button>
            </div>

            {submitted ? (
              <div
                role="status"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800"
              >
                Phần nhập thông tin đã sẵn sàng. Dữ liệu chưa được lưu; bước sau
                sẽ kết nối nút này với Trip Planner và AI.
              </div>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
