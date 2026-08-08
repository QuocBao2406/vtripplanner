
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPartnerReviewManager } from "@/components/admin/admin-partner-review-manager";
import { AppRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Quản lý đối tác | VTripPlanner",
  description: "Duyệt hồ sơ đăng ký Partner trong VTripPlanner.",
};

export const dynamic = "force-dynamic";

const statusPriority: Record<string, number> = {
  PENDING: 0,
  REJECTED: 1,
  APPROVED: 2,
  SUSPENDED: 3,
  NOT_APPLIED: 4,
};

export default async function AdminPartnerPage() {
  await requireRole([AppRole.ADMIN]);

  const partners = await prisma.partner.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 100,
    select: {
      id: true,
      ownerUserId: true,
      name: true,
      slug: true,
      type: true,
      description: true,
      phone: true,
      email: true,
      websiteUrl: true,
      taxCode: true,
      businessLicenseUrl: true,
      approvalStatus: true,
      rejectionReason: true,
      submittedAt: true,
      reviewedAt: true,
      updatedAt: true,
      owner: {
        select: {
          email: true,
          profile: {
            select: {
              fullName: true,
              displayName: true,
            },
          },
        },
      },
      reviewedBy: {
        select: {
          email: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  });

  const sortedPartners = [...partners].sort((first, second) => {
    const statusDifference =
      (statusPriority[first.approvalStatus] ?? 99) -
      (statusPriority[second.approvalStatus] ?? 99);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const firstTime =
      first.submittedAt?.getTime() ?? first.updatedAt.getTime();
    const secondTime =
      second.submittedAt?.getTime() ?? second.updatedAt.getTime();

    return secondTime - firstTime;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            VTripPlanner
          </Link>
          <span className="text-sm font-semibold text-slate-300">
            ADMIN · Đối tác
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link
            href="/quan-tri"
            className="text-slate-500 transition hover:text-violet-700"
          >
            ← Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <Link
            href="/quan-tri/dia-diem"
            className="text-violet-700 transition hover:text-violet-900"
          >
            Quản lý địa điểm
          </Link>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
            Partner Approval
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Duyệt hồ sơ đối tác
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Hồ sơ mới ở trạng thái PENDING. Chỉ khi ADMIN bấm phê duyệt thì
            tài khoản chủ sở hữu mới được cấp role PARTNER.
          </p>
        </div>

        <AdminPartnerReviewManager
          initialPartners={sortedPartners.map((partner) => ({
            id: partner.id,
            ownerUserId: partner.ownerUserId,
            ownerName:
              partner.owner.profile?.displayName ??
              partner.owner.profile?.fullName ??
              partner.owner.email ??
              "Người dùng",
            ownerEmail: partner.owner.email ?? "",
            name: partner.name,
            slug: partner.slug,
            type: partner.type,
            description: partner.description ?? "",
            phone: partner.phone ?? "",
            email: partner.email ?? "",
            websiteUrl: partner.websiteUrl ?? "",
            taxCode: partner.taxCode ?? "",
            businessLicenseUrl: partner.businessLicenseUrl ?? "",
            approvalStatus: partner.approvalStatus,
            rejectionReason: partner.rejectionReason ?? "",
            submittedAt: partner.submittedAt?.toISOString() ?? null,
            reviewedAt: partner.reviewedAt?.toISOString() ?? null,
            reviewerName:
              partner.reviewedBy?.profile?.displayName ??
              partner.reviewedBy?.email ??
              "",
          }))}
        />
      </div>
    </main>
  );
}
