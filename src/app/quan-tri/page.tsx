import type { Metadata } from "next";
import Link from "next/link";

import { AppRole } from "@/generated/prisma/enums";
import { requireRole, ROLE_LABELS } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Khu vực quản trị | VTripPlanner",
  description: "Khu vực được bảo vệ dành cho quản trị viên.",
};

export default async function AdminPage() {
  const access = await requireRole([AppRole.ADMIN]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-violet-800 to-indigo-800 px-6 py-8 text-white sm:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-100">
            Khu vực được bảo vệ
          </p>
          <h1 className="mt-3 text-3xl font-black">Trang quản trị hệ thống</h1>
          <p className="mt-3 text-sm leading-6 text-violet-50">
            Server đã xác minh vai trò ADMIN.
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {access.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-800"
              >
                {ROLE_LABELS[role]} {role}
              </span>
            ))}
          </div>

          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Đây là trang kiểm tra hạ tầng phân quyền cho quản trị viên.
          </p>

          <Link
            href="/tai-khoan"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-100"
          >
            Quay lại tài khoản
          </Link>
        </div>
      </section>
    </main>
  );
}