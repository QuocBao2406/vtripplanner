
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PartnerPlaceManager } from "@/components/partner/partner-place-manager";
import {
  AppRole,
  PartnerApprovalStatus,
} from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Địa điểm của đối tác | VTripPlanner",
  description: "Tạo và theo dõi địa điểm do Partner gửi xét duyệt.",
};

export const dynamic = "force-dynamic";

export default async function PartnerPlacesPage() {
  const access = await requireRole([AppRole.PARTNER]);

  const partner = await prisma.partner.findUnique({
    where: {
      ownerUserId: access.applicationUserId,
    },
    select: {
      id: true,
      name: true,
      approvalStatus: true,
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

  const [places, categories, provinces] = await Promise.all([
    prisma.place.findMany({
      where: {
        partnerId: partner.id,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        provinceId: true,
        districtId: true,
        shortDescription: true,
        description: true,
        addressLine: true,
        ward: true,
        phone: true,
        email: true,
        websiteUrl: true,
        verificationStatus: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
        isActive: true,
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
        district: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.placeCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.province.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        districts: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            VTripPlanner
          </Link>
          <span className="text-sm font-semibold text-slate-300">
            PARTNER · Địa điểm
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link
            href="/doi-tac"
            className="text-slate-500 transition hover:text-sky-700"
          >
            ← Trung tâm đối tác
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sky-700">{partner.name}</span>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            Partner Place Submission
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Địa điểm & dịch vụ của tôi
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Địa điểm Partner gửi sẽ ở trạng thái PENDING và chưa hoạt động.
            Chỉ sau khi ADMIN phê duyệt thành VERIFIED thì địa điểm mới đủ điều
            kiện tham gia dữ liệu gợi ý của hệ thống.
          </p>
        </div>

        <PartnerPlaceManager
          categories={categories}
          provinces={provinces}
          initialPlaces={places.map((place) => ({
            id: place.id,
            name: place.name,
            slug: place.slug,
            categoryId: place.categoryId,
            categoryName: place.category.name,
            provinceId: place.provinceId,
            provinceName: place.province.name,
            districtId: place.districtId ?? "",
            districtName: place.district?.name ?? "",
            shortDescription: place.shortDescription ?? "",
            description: place.description ?? "",
            addressLine: place.addressLine,
            ward: place.ward ?? "",
            phone: place.phone ?? "",
            email: place.email ?? "",
            websiteUrl: place.websiteUrl ?? "",
            verificationStatus: place.verificationStatus,
            rejectionReason: place.rejectionReason ?? "",
            submittedAt: place.submittedAt?.toISOString() ?? null,
            reviewedAt: place.reviewedAt?.toISOString() ?? null,
            isActive: place.isActive,
            updatedAt: place.updatedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
