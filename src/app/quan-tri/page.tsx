
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CircleAlert,
  Database,
  FileText,
  Map,
  MapPinned,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  AppRole,
  PartnerApprovalStatus,
  PlaceVerificationStatus,
  TravelPostStatus,
} from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Quản trị hệ thống | VTripPlanner",
  description: "Tổng quan vận hành và dữ liệu hệ thống VTripPlanner.",
};

export const dynamic = "force-dynamic";

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
};

type ModuleCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value.toLocaleString("vi-VN")}
          </p>
        </div>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function ModuleCard({
  title,
  description,
  icon: Icon,
  badge = "Sắp triển khai",
}: ModuleCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon aria-hidden="true" className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{title}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {badge}
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function formatReviewTime(value: Date | null): string {
  if (!value) {
    return "Chưa ghi nhận thời gian gửi";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export default async function AdminPage() {
  const access = await requireRole([AppRole.ADMIN]);

  const [
    activeUserCount,
    inactiveUserCount,
    partnerCount,
    pendingPartnerCount,
    activeProvinceCount,
    activePlaceCount,
    pendingPlaceCount,
    publishedPostCount,
    pendingPartners,
    pendingPlaces,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        OR: [
          {
            isActive: false,
          },
          {
            deletedAt: {
              not: null,
            },
          },
        ],
      },
    }),
    prisma.partner.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.partner.count({
      where: {
        approvalStatus: PartnerApprovalStatus.PENDING,
        deletedAt: null,
      },
    }),
    prisma.province.count({
      where: {
        isActive: true,
      },
    }),
    prisma.place.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    }),
    prisma.place.count({
      where: {
        verificationStatus: PlaceVerificationStatus.PENDING,
        deletedAt: null,
      },
    }),
    prisma.travelPost.count({
      where: {
        status: TravelPostStatus.PUBLISHED,
        deletedAt: null,
      },
    }),
    prisma.partner.findMany({
      where: {
        approvalStatus: PartnerApprovalStatus.PENDING,
        deletedAt: null,
      },
      orderBy: [
        {
          submittedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        submittedAt: true,
      },
    }),
    prisma.place.findMany({
      where: {
        verificationStatus: PlaceVerificationStatus.PENDING,
        deletedAt: null,
      },
      orderBy: [
        {
          submittedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 5,
      select: {
        id: true,
        name: true,
        submittedAt: true,
        province: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const adminEmail = access.authUser.email ?? "Tài khoản quản trị";
  const totalPending = pendingPartnerCount + pendingPlaceCount;

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

          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden min-w-0 text-right sm:block">
              <span className="block truncate text-sm font-semibold">
                Quản trị hệ thống
              </span>
              <span className="block max-w-56 truncate text-xs text-slate-400">
                {adminEmail}
              </span>
            </span>

            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-500 font-black text-white">
              A
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex text-sm font-semibold text-slate-500 transition hover:text-violet-700"
            >
              ← Trở về trang chủ
            </Link>

            <div className="mt-4 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <ShieldCheck aria-hidden="true" className="size-6" />
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Admin Dashboard
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Tổng quan VTripPlanner
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Theo dõi tài khoản, đối tác, khu vực, địa điểm và nội dung đang
              vận hành trong hệ thống. Các số liệu bên dưới được đọc trực tiếp
              từ database.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 ${
              totalPending > 0
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <CircleAlert aria-hidden="true" className="size-5" />
              <span className="text-sm font-bold">
                {totalPending > 0
                  ? `${totalPending} mục đang chờ duyệt`
                  : "Không có mục chờ duyệt"}
              </span>
            </div>
          </div>
        </div>

        <section className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Người dùng hoạt động"
              value={activeUserCount}
              description={`${inactiveUserCount.toLocaleString(
                "vi-VN",
              )} tài khoản đang khóa hoặc đã xóa mềm.`}
              icon={Users}
            />
            <StatCard
              label="Đối tác"
              value={partnerCount}
              description={`${pendingPartnerCount.toLocaleString(
                "vi-VN",
              )} hồ sơ đối tác đang chờ xét duyệt.`}
              icon={Building2}
            />
            <StatCard
              label="Khu vực du lịch"
              value={activeProvinceCount}
              description="Các tỉnh/thành đang hoạt động và có thể dùng làm điểm đến."
              icon={Map}
            />
            <StatCard
              label="Địa điểm"
              value={activePlaceCount}
              description={`${pendingPlaceCount.toLocaleString(
                "vi-VN",
              )} địa điểm đang chờ xác minh.`}
              icon={MapPinned}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Bài viết đã xuất bản"
              value={publishedPostCount}
              description="Bao gồm bài cộng đồng và nội dung du lịch đang hiển thị hợp lệ."
              icon={FileText}
            />
            <StatCard
              label="Nguồn dữ liệu"
              value={
                activeProvinceCount +
                activePlaceCount +
                partnerCount
              }
              description="Tổng quan nhanh dữ liệu khu vực, địa điểm và đối tác đang có trong hệ thống."
              icon={Database}
            />
          </div>
        </section>

        <section className="mt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
              Khu vực quản trị
            </p>
            <h2 className="mt-1 text-xl font-black">
              Các module quản lý
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Dashboard đã có nền dữ liệu thật. Các màn hình CRUD sẽ được mở
              lần lượt ở các bước kế tiếp để tránh tạo link 404.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ModuleCard
              title="Người dùng"
              description="Xem tài khoản, trạng thái hoạt động và vai trò được cấp."
              icon={Users}
            />
            <ModuleCard
              title="Đối tác"
              description="Duyệt đăng ký đối tác và theo dõi trạng thái hoạt động."
              icon={Building2}
            />
            <ModuleCard
              title="Khu vực du lịch"
              description="Tạo và quản lý điểm đến cấp tỉnh/thành như Vũng Tàu, Phan Thiết."
              icon={Map}
              badge="Bước tiếp theo"
            />
            <ModuleCard
              title="Địa điểm"
              description="Tạo Place/POI, quản lý dữ liệu và xét duyệt địa điểm do Partner gửi."
              icon={MapPinned}
              badge="Bước tiếp theo"
            />
            <ModuleCard
              title="Bài viết"
              description="Theo dõi nội dung cộng đồng và hỗ trợ moderation khi cần."
              icon={FileText}
            />
            <ModuleCard
              title="Voucher & Khuyến mãi"
              description="Quản lý chương trình ưu đãi và voucher trên toàn hệ thống."
              icon={Ticket}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  Đối tác
                </p>
                <h2 className="mt-1 text-lg font-black">
                  Hồ sơ đang chờ duyệt
                </h2>
              </div>

              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {pendingPartnerCount.toLocaleString("vi-VN")}
              </span>
            </div>

            {pendingPartners.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-100">
                {pendingPartners.map((partner) => (
                  <div key={partner.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {partner.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {partner.type.replaceAll("_", " ")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                        Chờ duyệt
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {formatReviewTime(partner.submittedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Hiện chưa có hồ sơ Partner nào chờ duyệt.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  Địa điểm
                </p>
                <h2 className="mt-1 text-lg font-black">
                  Place đang chờ xác minh
                </h2>
              </div>

              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {pendingPlaceCount.toLocaleString("vi-VN")}
              </span>
            </div>

            {pendingPlaces.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-100">
                {pendingPlaces.map((place) => (
                  <div key={place.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {place.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {place.category.name} · {place.province.name}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                        Chờ duyệt
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {formatReviewTime(place.submittedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Hiện chưa có Place nào chờ xác minh.
              </p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
