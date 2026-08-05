import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-3 rounded-xl px-3 py-2 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-sm">
            V
          </span>
          <span className="text-xl font-black tracking-tight text-slate-950">
            VTripPlanner
          </span>
        </Link>

        <main className="mt-8 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8">
          {children}
        </main>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Nền tảng hỗ trợ lập lịch trình du lịch cá nhân hóa tại Việt Nam.
        </p>
      </div>
    </div>
  );
}
