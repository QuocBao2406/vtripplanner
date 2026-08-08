
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";
import { AccountProfileEditor } from "@/components/account/account-profile-editor";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân | VTripPlanner",
  description: "Xem và cập nhật hồ sơ cá nhân VTripPlanner.",
};

export const dynamic = "force-dynamic";

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return "Chưa có thông tin";
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function getRoleLabel(role: "USER" | "PARTNER" | "ADMIN"): string {
  if (role === "ADMIN") {
    return "Quản trị viên";
  }

  if (role === "PARTNER") {
    return "Đối tác";
  }

  return "Người dùng";
}

function getRoleClassName(role: "USER" | "PARTNER" | "ADMIN"): string {
  if (role === "ADMIN") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (role === "PARTNER") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function AccountPage() {
  const authorization = await getCurrentAuthorization();

  if (authorization.status === "anonymous") {
    redirect(
      `/dang-nhap?message=${encodeURIComponent(
        "Vui lòng đăng nhập để mở hồ sơ cá nhân.",
      )}`,
    );
  }

  if (authorization.status === "inactive") {
    redirect("/khong-co-quyen?reason=inactive");
  }

  const { access } = authorization;

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: access.applicationUserId,
    },
    select: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,
      deletedAt: true,
      profile: {
        select: {
          fullName: true,
          displayName: true,
          phone: true,
          dateOfBirth: true,
          city: true,
          bio: true,
          updatedAt: true,
        },
      },
    },
  });

  if (
    !applicationUser ||
    !applicationUser.isActive ||
    applicationUser.deletedAt
  ) {
    redirect("/khong-co-quyen?reason=inactive");
  }

  const displayName =
    applicationUser.profile?.displayName?.trim() ||
    applicationUser.profile?.fullName?.trim() ||
    applicationUser.email?.split("@")[0] ||
    access.authUser.email?.split("@")[0] ||
    "Tài khoản";

  const initial =
    Array.from(displayName.trim())[0]?.toLocaleUpperCase("vi-VN") ?? "U";

  const roles = access.roles;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-slate-950 transition hover:text-emerald-700"
          >
            VTripPlanner
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 sm:px-4"
            >
              ← Trở về trang chủ
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                className="hidden min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:inline-flex sm:items-center"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-black text-white">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Hồ sơ cá nhân
              </p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight">
                {displayName}
              </h1>
              <p className="mt-1 truncate text-sm text-slate-500">
                {applicationUser.email ?? access.authUser.email ?? "Chưa có email"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${getRoleClassName(
                    role,
                  )}`}
                >
                  {getRoleLabel(role)}
                </span>
              ))}
            </div>
          </div>

          <dl className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Trạng thái
              </dt>
              <dd className="mt-1 text-sm font-semibold text-emerald-700">
                Đang hoạt động
              </dd>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Xác nhận email
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {access.authUser.email_confirmed_at
                  ? formatDateTime(access.authUser.email_confirmed_at)
                  : "Chưa xác nhận"}
              </dd>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Ngày tạo tài khoản
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {formatDateTime(
                  access.authUser.created_at ?? applicationUser.createdAt,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <AccountProfileEditor
          initialProfile={{
            fullName: applicationUser.profile?.fullName ?? "",
            displayName: applicationUser.profile?.displayName ?? "",
            phone: applicationUser.profile?.phone ?? "",
            dateOfBirth: applicationUser.profile?.dateOfBirth
              ? applicationUser.profile.dateOfBirth.toISOString().slice(0, 10)
              : "",
            city: applicationUser.profile?.city ?? "",
            bio: applicationUser.profile?.bio ?? "",
            updatedAt: applicationUser.profile?.updatedAt
              ? applicationUser.profile.updatedAt.toISOString()
              : null,
          }}
        />

        <div className="mt-4 flex justify-center sm:hidden">
          <form action={signOutAction} className="w-full">
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
