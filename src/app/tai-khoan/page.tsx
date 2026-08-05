import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Tài khoản | VTripPlanner",
  description: "Thông tin tài khoản VTripPlanner.",
};

type AccountPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function getFirstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "Chưa có thông tin";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AccountPage({
  searchParams,
}: AccountPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/dang-nhap?message=${encodeURIComponent(
        "Vui lòng đăng nhập để mở trang tài khoản.",
      )}`,
    );
  }

  const parameters = await searchParams;
  const errorMessage = getFirstValue(parameters.error);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-slate-950"
          >
            VTripPlanner
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              Đăng xuất
            </button>
          </form>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-8 text-white sm:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100">
              Tài khoản
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">
              Đăng nhập thành công
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50">
              Phiên đăng nhập đã được xác minh ở phía server.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {errorMessage}
              </div>
            ) : null}

            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Email
                </dt>
                <dd className="mt-2 break-all text-sm font-semibold text-slate-950">
                  {user.email ?? "Chưa có email"}
                </dd>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Xác nhận email
                </dt>
                <dd className="mt-2 text-sm font-semibold text-slate-950">
                  {user.email_confirmed_at
                    ? formatDate(user.email_confirmed_at)
                    : "Chưa xác nhận"}
                </dd>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Mã tài khoản
                </dt>
                <dd className="mt-2 break-all font-mono text-xs text-slate-700">
                  {user.id}
                </dd>
              </div>
            </dl>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Trang này hiện chỉ dùng để xác minh luồng Authentication. Hồ sơ cá
              nhân và vai trò người dùng sẽ được bổ sung ở các bước tiếp theo.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
