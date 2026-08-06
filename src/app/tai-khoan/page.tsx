import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";
import { ProfileForm } from "@/components/account/profile-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Tài khoản | VTripPlanner",
  description: "Thông tin tài khoản và hồ sơ VTripPlanner.",
};

type AccountPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

const roleLabels: Record<string, string> = {
  USER: "Người dùng",
  PARTNER: "Đối tác",
  ADMIN: "Quản trị viên",
};

function getFirstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(
  value: Date | string | null | undefined,
): string {
  if (!value) {
    return "Chưa có thông tin";
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có thông tin";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateInput(
  value: Date | null | undefined,
): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

export default async function AccountPage({
  searchParams,
}: AccountPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(
      `/dang-nhap?message=${encodeURIComponent(
        "Vui lòng đăng nhập để mở trang tài khoản.",
      )}`,
    );
  }

  const [parameters, applicationUser] = await Promise.all([
    searchParams,
    prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        isActive: true,
        createdAt: true,
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
        userRoles: {
          select: {
            assignedAt: true,
            role: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            assignedAt: "asc",
          },
        },
      },
    }),
  ]);

  const errorMessage = getFirstValue(parameters.error);
  const successMessage = getFirstValue(parameters.message);

  const activeRoles =
    applicationUser?.userRoles
      .filter((userRole) => userRole.role.isActive)
      .map((userRole) => userRole.role.name) ?? [];

  const profile = applicationUser?.profile;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
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
              Hồ sơ cá nhân
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
              Quản lý thông tin cá nhân và kiểm tra vai trò đang được
              cấp cho tài khoản VTripPlanner.
            </p>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              >
                {successMessage}
              </div>
            ) : null}

            {!applicationUser ? (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
              >
                Không tìm thấy tài khoản ứng dụng tương ứng với phiên
                đăng nhập hiện tại.
              </div>
            ) : null}

            <section>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                  Thông tin đăng nhập
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Trạng thái tài khoản
                </h2>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Email
                  </dt>

                  <dd className="mt-2 break-all text-sm font-semibold text-slate-950">
                    {currentUser.email ?? "Chưa có email"}
                  </dd>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Xác nhận email
                  </dt>

                  <dd className="mt-2 text-sm font-semibold text-slate-950">
                    {currentUser.email_confirmed_at
                      ? formatDate(currentUser.email_confirmed_at)
                      : "Chưa xác nhận"}
                  </dd>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Ngày tạo tài khoản
                  </dt>

                  <dd className="mt-2 text-sm font-semibold text-slate-950">
                    {formatDate(applicationUser?.createdAt)}
                  </dd>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Trạng thái
                  </dt>

                  <dd className="mt-2 text-sm font-semibold text-slate-950">
                    {applicationUser?.isActive
                      ? "Đang hoạt động"
                      : "Không hoạt động"}
                  </dd>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Mã tài khoản
                  </dt>

                  <dd className="mt-2 break-all font-mono text-xs text-slate-700">
                    {currentUser.id}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border-t border-slate-200 pt-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                  Phân quyền
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Vai trò hiện tại
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Vai trò quyết định các khu vực và nghiệp vụ tài khoản
                  được phép truy cập.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {activeRoles.length > 0 ? (
                  activeRoles.map((roleName) => (
                    <span
                      key={roleName}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800"
                    >
                      {roleLabels[roleName] ?? roleName}
                      <span className="ml-2 font-mono text-xs text-emerald-600">
                        {roleName}
                      </span>
                    </span>
                  ))
                ) : (
                  <p className="text-sm font-medium text-amber-800">
                    Tài khoản chưa được gán vai trò hoạt động.
                  </p>
                )}
              </div>
            </section>

            {applicationUser ? (
              <section className="border-t border-slate-200 pt-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                    Hồ sơ
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Thông tin cá nhân
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Các trường không bắt buộc. Bạn có thể để trống những
                    thông tin chưa muốn cung cấp.
                  </p>

                  {profile?.updatedAt ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Cập nhật gần nhất:{" "}
                      {formatDate(profile.updatedAt)}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">
                  <ProfileForm
                    initialValues={{
                      fullName: profile?.fullName ?? "",
                      displayName: profile?.displayName ?? "",
                      phone: profile?.phone ?? "",
                      dateOfBirth: formatDateInput(
                        profile?.dateOfBirth,
                      ),
                      city: profile?.city ?? "",
                      bio: profile?.bio ?? "",
                    }}
                  />
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}