import type { Metadata } from "next";
import Link from "next/link";

import { AppRole } from "@/generated/prisma/enums";
import { requireRole, ROLE_LABELS } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Khu vực đối tác | VTripPlanner",
  description: "Khu vực được bảo vệ dành cho đối tác.",
};

export default async function PartnerPage() {
  const access = await requireRole([AppRole.PARTNER, AppRole.ADMIN]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-sky-700 to-cyan-700 px-6 py-8 text-white sm:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-100">
            Khu vực được bảo vệ
          </p>
          <h1 className="mt-3 text-3xl font-black">Trang dành cho đối tác</h1>
          <p className="mt-3 text-sm leading-6 text-sky-50">
            Server đã xác minh vai trò PARTNER hoặc ADMIN.
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {access.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-800"
              >
                {ROLE_LABELS[role]} {role}
              </span>
            ))}
          </div>

          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Đây là trang kiểm tra hạ tầng phân quyền cho đối tác.
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