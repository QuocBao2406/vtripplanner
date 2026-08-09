
import {
  Building2,
  CircleCheck,
  Clock3,
  MapPinned,
  Megaphone,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AppRole,
  PartnerApprovalStatus,
  PlaceVerificationStatus,
} from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Trung tâm đối tác | VTripPlanner",
  description: "Quản lý hồ sơ và địa điểm của Partner VTripPlanner.",
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

function statusLabel(status: PlaceVerificationStatus): string {
  if (status === PlaceVerificationStatus.VERIFIED) {
    return "Đã duyệt";
  }

  if (status === PlaceVerificationStatus.PENDING) {
    return "Chờ duyệt";
  }

  if (status === PlaceVerificationStatus.REJECTED) {
    return "Cần chỉnh sửa";
  }

  if (status === PlaceVerificationStatus.SUSPENDED) {
    return "Tạm ngưng";
  }

  return "Bản nháp";
}

function statusClassName(status: PlaceVerificationStatus): string {
  if (status === PlaceVerificationStatus.VERIFIED) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === PlaceVerificationStatus.PENDING) {
    return "bg-amber-50 text-amber-700";
  }

  if (status === PlaceVerificationStatus.REJECTED) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default async function PartnerPage() {
  const access = await requireRole([AppRole.PARTNER]);

  const partner = await prisma.partner.findUnique({
    where: {
      ownerUserId: access.applicationUserId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      description: true,
      phone: true,
      email: true,
      websiteUrl: true,
      approvalStatus: true,
      reviewedAt: true,
      deletedAt: true,
    },
  });

  if (
    !partner ||
    partner.deletedAt ||
    partner.approvalStatus !== PartnerApprovalStatus.APPROVED
  ) {
    redirect("/dang-ky-doi-tac");
  }

  const [
    totalPlaceCount,
    pendingPlaceCount,
    verifiedPlaceCount,
    rejectedPlaceCount,
    recentPlaces,
  ] = await Promise.all([
    prisma.place.count({
      where: {
        partnerId: partner.id,
        deletedAt: null,
      },
    }),
    prisma.place.count({
      where: {
        partnerId: partner.id,
        verificationStatus: PlaceVerificationStatus.PENDING,
        deletedAt: null,
      },
    }),
    prisma.place.count({
      where: {
        partnerId: partner.id,
        verificationStatus: PlaceVerificationStatus.VERIFIED,
        deletedAt: null,
      },
    }),
    prisma.place.count({
      where: {
        partnerId: partner.id,
        verificationStatus: PlaceVerificationStatus.REJECTED,
        deletedAt: null,
      },
    }),
    prisma.place.findMany({
      where: {
        partnerId: partner.id,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        verificationStatus: true,
        isActive: true,
        rejectionReason: true,
        updatedAt: true,
        category: {
          select: {
            name: true,
          },
        },
        province: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            VTripPlanner
          </Link>
          <span className="text-sm font-semibold text-slate-300">
            PARTNER · Trung tâm đối tác
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 transition hover:text-sky-700"
        >
          ← Trở về trang chủ
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-sky-800 to-cyan-700 px-5 py-6 text-white sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-100">
                  Partner Center
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  {partner.name}
                </h1>
                <p className="mt-2 text-sm text-sky-50">
                  {partner.type.replaceAll("_", " ")}
                  {partner.email ? ` · ${partner.email}` : ""}
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                <CircleCheck aria-hidden="true" className="size-4" />
                PARTNER ĐÃ DUYỆT
              </span>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Tổng địa điểm
              </p>
              <p className="mt-2 text-2xl font-black">
                {totalPlaceCount.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Chờ duyệt
              </p>
              <p className="mt-2 text-2xl font-black text-amber-900">
                {pendingPlaceCount.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Đã duyệt
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-900">
                {verifiedPlaceCount.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                Cần chỉnh sửa
              </p>
              <p className="mt-2 text-2xl font-black text-red-900">
                {rejectedPlaceCount.toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/doi-tac/dia-diem"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <MapPinned aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-black">
              Địa điểm & dịch vụ của tôi
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tạo địa điểm mới, theo dõi trạng thái xét duyệt và gửi lại hồ sơ
              nếu ADMIN yêu cầu chỉnh sửa.
            </p>
            <p className="mt-4 text-sm font-bold text-sky-700">
              Quản lý địa điểm →
            </p>
          </Link>

          <Link
            href="/doi-tac/uu-dai"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Megaphone aria-hidden="true" className="size-5" />
            </span>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">
                Khuyến mãi & Voucher
              </h2>
              <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase text-sky-700">
                Quản lý
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tạo chương trình ưu đãi, chọn địa điểm áp dụng và theo dõi trạng
              thái ADMIN xét duyệt.
            </p>
            <p className="mt-4 text-sm font-bold text-sky-700">
              Quản lý ưu đãi →
            </p>
          </Link>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-sky-700">
                Gần đây
              </p>
              <h2 className="mt-1 text-lg font-black">
                Địa điểm của Partner
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Hồ sơ Partner được duyệt: {formatDate(partner.reviewedAt)}
            </p>
          </div>

          {recentPlaces.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {recentPlaces.map((place) => (
                <div
                  key={place.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">
                        {place.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusClassName(
                          place.verificationStatus,
                        )}`}
                      >
                        {statusLabel(place.verificationStatus)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {place.category.name} · {place.province.name}
                    </p>
                    {place.rejectionReason ? (
                      <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-700">
                        <TriangleAlert
                          aria-hidden="true"
                          className="mt-0.5 size-3.5 shrink-0"
                        />
                        {place.rejectionReason}
                      </p>
                    ) : null}
                  </div>

                  <span className="inline-flex w-fit items-center gap-1.5 text-xs text-slate-400">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    {formatDate(place.updatedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              Partner chưa có địa điểm nào. Hãy tạo địa điểm đầu tiên để gửi
              ADMIN xét duyệt.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Building2 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-black">Thông tin Partner</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {partner.description || "Chưa có mô tả Partner."}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {partner.phone ? <span>{partner.phone}</span> : null}
                {partner.websiteUrl ? (
                  <a
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    Website
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
