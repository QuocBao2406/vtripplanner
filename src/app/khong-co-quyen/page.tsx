import type { Metadata } from "next";
import Link from "next/link";

import { AppRole } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Không có quyền | VTripPlanner",
  description: "Tài khoản không có quyền truy cập khu vực yêu cầu.",
};

type AccessDeniedPageProps = {
  searchParams: Promise<{
    reason?: string | string[];
    required?: string | string[];
  }>;
};

const validRoles = new Set<string>(Object.values(AppRole));

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccessDeniedPage({
  searchParams,
}: AccessDeniedPageProps) {
  const parameters = await searchParams;
  const inactive = firstValue(parameters.reason) === "inactive";
  const requiredRoles = (firstValue(parameters.required) ?? "")
    .split(",")
    .filter((role): role is AppRole => validRoles.has(role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-black text-amber-800">
          !
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
          Quyền truy cập
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Không thể mở khu vực này
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">
          {inactive
            ? "Tài khoản ứng dụng không tồn tại hoặc đã bị vô hiệu hóa."
            : "Tài khoản chưa được cấp vai trò cần thiết."}
        </p>

        {!inactive && requiredRoles.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Vai trò được chấp nhận
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {requiredRoles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-amber-900"
                >
                  {ROLE_LABELS[role]} {role}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/tai-khoan"
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Về trang tài khoản
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
          >
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}