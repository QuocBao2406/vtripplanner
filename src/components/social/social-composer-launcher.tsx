"use client";

import { useState } from "react";

export function SocialComposerLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-black text-white">
          B
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-1 rounded-full bg-slate-100 px-5 py-3 text-left text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
        >
          Chia sẻ chuyến đi của bạn
        </button>
      </div>

      <div className="grid grid-cols-2 border-t border-slate-100 px-4 py-2 text-center text-sm font-bold text-slate-600 sm:px-5">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
        >
          📷 Ảnh
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
        >
          🎥 Video nhẹ
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-black text-white">
                  B
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Bạn
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    Chia sẻ với cộng đồng VTripPlanner
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Đóng trình tạo bài viết"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-500 shadow-sm"
              >
                ×
              </button>
            </div>

            <textarea
              rows={4}
              placeholder="Chuyến đi của bạn có gì thú vị?"
              className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <label className="mt-3 block rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center text-sm font-bold text-slate-600">
              <span>+ Chọn ảnh hoặc video nhẹ</span>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="mt-2 block w-full text-xs font-medium text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-bold file:text-emerald-700"
              />
            </label>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs leading-5 text-slate-500">
                Đăng bài thật và tên tài khoản sẽ được kết nối ở bước kế tiếp.
              </p>
              <button
                type="button"
                disabled
                className="rounded-xl bg-slate-300 px-5 py-2.5 text-sm font-black text-white"
              >
                Đăng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
