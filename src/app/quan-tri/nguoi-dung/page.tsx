import {
  Building2,
  Mail,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminUserStatusButton } from "@/components/admin/admin-user-status-button";
import { AppRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Quản lý người dùng | VTripPlanner",
  description:
    "Tìm kiếm, xem hồ sơ và quản lý trạng thái tài khoản VTripPlanner.",
};

export const dynamic = "force-dynamic";

type AdminUserSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

type UserStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

type UserRoleFilter =
  | "ALL"
  | AppRole;

const ROLE_LABELS: Record<AppRole, string> = {
  [AppRole.USER]: "USER",
  [AppRole.PARTNER]: "PARTNER",
  [AppRole.ADMIN]: "ADMIN",
};

function getSingleSearchParam(
  value: string | string[] | undefined,
): string {
  return typeof value === "string" ? value : "";
}

function parseStatusFilter(
  value: string,
): UserStatusFilter {
  if (
    value === "ACTIVE" ||
    value === "INACTIVE"
  ) {
    return value;
  }

  return "ALL";
}

function parseRoleFilter(
  value: string,
): UserRoleFilter {
  if (
    value === AppRole.USER ||
    value === AppRole.PARTNER ||
    value === AppRole.ADMIN
  ) {
    return value;
  }

  return "ALL";
}

function formatDateTime(
  value: Date | null,
): string {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

function getDisplayName(user: {
  email: string | null;
  profile: {
    fullName: string | null;
    displayName: string | null;
  } | null;
}): string {
  return (
    user.profile?.displayName?.trim() ||
    user.profile?.fullName?.trim() ||
    user.email?.split("@")[0] ||
    "Tài khoản"
  );
}

function getRoleClassName(
  role: AppRole,
): string {
  switch (role) {
    case AppRole.ADMIN:
      return "border-violet-200 bg-violet-50 text-violet-700";
    case AppRole.PARTNER:
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: AdminUserSearchParams;
}) {
  const access = await requireRole([
    AppRole.ADMIN,
  ]);
  const resolvedSearchParams =
    await searchParams;

  const searchQuery =
    getSingleSearchParam(
      resolvedSearchParams.q,
    ).trim();
  const statusFilter =
    parseStatusFilter(
      getSingleSearchParam(
        resolvedSearchParams.status,
      ),
    );
  const roleFilter =
    parseRoleFilter(
      getSingleSearchParam(
        resolvedSearchParams.role,
      ),
    );

  const users = await prisma.user.findMany({
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    select: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      profile: {
        select: {
          fullName: true,
          displayName: true,
          phone: true,
          city: true,
          bio: true,
        },
      },
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const userIds = users.map(
    (user) => user.id,
  );

  const partners =
    userIds.length > 0
      ? await prisma.partner.findMany({
          where: {
            ownerUserId: {
              in: userIds,
            },
            deletedAt: null,
          },
          select: {
            ownerUserId: true,
            name: true,
            approvalStatus: true,
          },
        })
      : [];

  const partnerByUserId = new Map(
    partners.map((partner) => [
      partner.ownerUserId,
      partner,
    ]),
  );

  const normalizedQuery =
    searchQuery.toLocaleLowerCase(
      "vi-VN",
    );

  const normalizedUsers = users.map(
    (user) => {
      const roles = user.userRoles
        .filter(
          (item) => item.role.isActive,
        )
        .map(
          (item) => item.role.name,
        )
        .sort();

      return {
        ...user,
        roles,
        partner:
          partnerByUserId.get(
            user.id,
          ) ?? null,
      };
    },
  );

  const filteredUsers =
    normalizedUsers.filter((user) => {
      const displayName =
        getDisplayName(user);
      const searchableText = [
        user.email ?? "",
        user.profile?.fullName ?? "",
        user.profile?.displayName ??
          "",
      ]
        .join(" ")
        .toLocaleLowerCase("vi-VN");

      const queryMatches =
        !normalizedQuery ||
        searchableText.includes(
          normalizedQuery,
        );

      const roleMatches =
        roleFilter === "ALL" ||
        user.roles.includes(roleFilter);

      const effectivelyActive =
        user.isActive &&
        !user.deletedAt;

      const statusMatches =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          effectivelyActive) ||
        (statusFilter ===
          "INACTIVE" &&
          !effectivelyActive);

      return (
        queryMatches &&
        roleMatches &&
        statusMatches &&
        Boolean(displayName)
      );
    });

  const activeCount =
    normalizedUsers.filter(
      (user) =>
        user.isActive &&
        !user.deletedAt,
    ).length;
  const inactiveCount =
    normalizedUsers.length -
    activeCount;
  const adminCount =
    normalizedUsers.filter(
      (user) =>
        user.roles.includes(
          AppRole.ADMIN,
        ),
    ).length;
  const partnerRoleCount =
    normalizedUsers.filter(
      (user) =>
        user.roles.includes(
          AppRole.PARTNER,
        ),
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-black tracking-tight transition hover:text-violet-200"
          >
            VTripPlanner
          </Link>

          <div className="text-right">
            <p className="text-sm font-bold">
              ADMIN · Người dùng
            </p>
            <p className="hidden max-w-64 truncate text-xs text-slate-400 sm:block">
              {access.authUser.email ??
                "Tài khoản quản trị"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
              <Link
                href="/quan-tri"
                className="text-slate-500 transition hover:text-violet-700"
              >
                ← Dashboard
              </Link>
              <Link
                href="/"
                className="text-slate-500 transition hover:text-violet-700"
              >
                Trang chủ
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Users
                  aria-hidden="true"
                  className="size-6"
                />
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Admin User Management
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Quản lý người dùng
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Tìm kiếm tài khoản, xem hồ
              sơ và khóa/mở tài khoản
              thường. Role PARTNER vẫn
              được cấp qua luồng duyệt đối
              tác; ADMIN không được cấp
              thủ công tại màn hình này.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
            <div className="flex items-start gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <p>
                Tài khoản có role ADMIN
                được bảo vệ và không thể
                bị khóa tại đây.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Tổng tài khoản
            </p>
            <p className="mt-2 text-3xl font-black">
              {normalizedUsers.length.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Đang hoạt động
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-900">
              {activeCount.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Không hoạt động
            </p>
            <p className="mt-2 text-3xl font-black text-amber-900">
              {inactiveCount.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Role đặc biệt
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {partnerRoleCount.toLocaleString(
                "vi-VN",
              )}{" "}
              PARTNER ·{" "}
              {adminCount.toLocaleString(
                "vi-VN",
              )}{" "}
              ADMIN
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            method="get"
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
          >
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Tìm kiếm
              </span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <Search
                  aria-hidden="true"
                  className="size-4 shrink-0 text-slate-400"
                />
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Tên hoặc email..."
                  className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Vai trò
              </span>
              <select
                name="role"
                defaultValue={roleFilter}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-300"
              >
                <option value="ALL">
                  Tất cả
                </option>
                <option
                  value={
                    AppRole.USER
                  }
                >
                  USER
                </option>
                <option
                  value={
                    AppRole.PARTNER
                  }
                >
                  PARTNER
                </option>
                <option
                  value={
                    AppRole.ADMIN
                  }
                >
                  ADMIN
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Trạng thái
              </span>
              <select
                name="status"
                defaultValue={
                  statusFilter
                }
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-300"
              >
                <option value="ALL">
                  Tất cả
                </option>
                <option value="ACTIVE">
                  Đang hoạt động
                </option>
                <option value="INACTIVE">
                  Không hoạt động
                </option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Lọc
              </button>
              <Link
                href="/quan-tri/nguoi-dung"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            </div>
          </form>

          <p className="mt-3 text-xs text-slate-500">
            Hiển thị{" "}
            <strong className="text-slate-700">
              {filteredUsers.length.toLocaleString(
                "vi-VN",
              )}
            </strong>{" "}
            /{" "}
            {normalizedUsers.length.toLocaleString(
              "vi-VN",
            )}{" "}
            tài khoản.
          </p>
        </section>

        <section className="mt-5 space-y-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const displayName =
                getDisplayName(user);
              const effectivelyActive =
                user.isActive &&
                !user.deletedAt;
              const hasAdminRole =
                user.roles.includes(
                  AppRole.ADMIN,
                );
              const isCurrentAdmin =
                user.id ===
                access.applicationUserId;

              const disabledReason =
                user.deletedAt
                  ? "Tài khoản đã xóa mềm nên không thể đổi trạng thái tại đây."
                  : hasAdminRole
                    ? "Tài khoản ADMIN được bảo vệ; không thể khóa/mở từ màn hình này."
                    : isCurrentAdmin
                      ? "Không thể tự thay đổi trạng thái tài khoản đang đăng nhập."
                      : null;

              return (
                <article
                  key={user.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-black text-slate-950">
                          {displayName}
                        </h2>

                        {effectivelyActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <UserRoundCheck
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            <UserRoundX
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            {user.deletedAt
                              ? "Đã xóa mềm"
                              : "Đã vô hiệu hóa"}
                          </span>
                        )}

                        {isCurrentAdmin ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                            Bạn đang đăng nhập
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <Mail
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                        <span className="truncate">
                          {user.email ??
                            "Chưa có email"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.roles.length >
                        0 ? (
                          user.roles.map(
                            (role) => (
                              <span
                                key={role}
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getRoleClassName(
                                  role,
                                )}`}
                              >
                                {
                                  ROLE_LABELS[
                                    role
                                  ]
                                }
                              </span>
                            ),
                          )
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            Chưa có role active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full lg:w-auto lg:min-w-48">
                      <AdminUserStatusButton
                        userId={user.id}
                        userLabel={displayName}
                        isActive={
                          effectivelyActive
                        }
                        disabledReason={
                          disabledReason
                        }
                      />
                    </div>
                  </div>

                  <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700">
                      Xem chi tiết tài khoản
                    </summary>

                    <div className="grid gap-4 border-t border-slate-200 px-4 py-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Hồ sơ
                        </p>

                        <dl className="mt-2 space-y-2 text-sm">
                          <div>
                            <dt className="text-slate-500">
                              Họ tên
                            </dt>
                            <dd className="font-semibold text-slate-900">
                              {user.profile
                                ?.fullName ??
                                "Chưa cập nhật"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Tên hiển thị
                            </dt>
                            <dd className="font-semibold text-slate-900">
                              {user.profile
                                ?.displayName ??
                                "Chưa cập nhật"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Điện thoại
                            </dt>
                            <dd className="font-semibold text-slate-900">
                              {user.profile
                                ?.phone ??
                                "Chưa cập nhật"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Tỉnh / thành phố
                            </dt>
                            <dd className="font-semibold text-slate-900">
                              {user.profile
                                ?.city ??
                                "Chưa cập nhật"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Giới thiệu
                            </dt>
                            <dd className="whitespace-pre-wrap font-medium leading-6 text-slate-700">
                              {user.profile
                                ?.bio ??
                                "Chưa cập nhật"}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Tài khoản
                        </p>

                        <dl className="mt-2 space-y-2 text-sm">
                          <div>
                            <dt className="text-slate-500">
                              ID
                            </dt>
                            <dd className="break-all font-mono text-xs font-semibold text-slate-800">
                              {user.id}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Ngày tạo
                            </dt>
                            <dd className="font-semibold text-slate-900">
                              {formatDateTime(
                                user.createdAt,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Cập nhật gần nhất
                            </dt>
                            <dd className="font-semibold text-slate-900">
                              {formatDateTime(
                                user.updatedAt,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Partner
                            </dt>
                            <dd className="font-semibold text-slate-900">
                              {user.partner ? (
                                <span className="inline-flex flex-wrap items-center gap-1.5">
                                  <Building2
                                    aria-hidden="true"
                                    className="size-4 text-sky-600"
                                  />
                                  {
                                    user.partner
                                      .name
                                  }{" "}
                                  ·{" "}
                                  {user.partner.approvalStatus.replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </span>
                              ) : (
                                "Không có hồ sơ Partner"
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </details>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
              <Users
                aria-hidden="true"
                className="mx-auto size-8 text-slate-300"
              />
              <p className="mt-3 font-bold text-slate-800">
                Không tìm thấy tài khoản
                phù hợp.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Thử thay đổi từ khóa,
                role hoặc trạng thái lọc.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
