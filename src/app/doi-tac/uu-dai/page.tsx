import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PartnerPromotionManager } from "@/components/partner/partner-promotion-manager";
import { AppRole, PartnerApprovalStatus, PlaceVerificationStatus } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Khuyến mãi & Voucher | VTripPlanner Partner",
  description: "Tạo và quản lý chương trình ưu đãi của Partner.",
};

export const dynamic = "force-dynamic";

export default async function PartnerPromotionPage() {
  const access = await requireRole([AppRole.PARTNER]);

  const partner = await prisma.partner.findUnique({
    where: { ownerUserId: access.applicationUserId },
    select: { id: true, name: true, approvalStatus: true, deletedAt: true },
  });

  if (!partner || partner.deletedAt || partner.approvalStatus !== PartnerApprovalStatus.APPROVED) {
    redirect("/dang-ky-doi-tac");
  }

  const [promotions, eligiblePlaces] = await Promise.all([
    prisma.promotion.findMany({
      where: { partnerId: partner.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, title: true, description: true, terms: true,
        discountType: true, discountValue: true, maxDiscountAmount: true,
        minimumSpend: true, startAt: true, endAt: true, totalQuantity: true,
        status: true, rejectionReason: true, submittedAt: true, reviewedAt: true,
        isActive: true,
        places: { select: { placeId: true, place: { select: { name: true } } } },
        _count: { select: { claims: true } },
      },
    }),
    prisma.place.findMany({
      where: {
        partnerId: partner.id,
        verificationStatus: PlaceVerificationStatus.VERIFIED,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true,
        province: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="font-black">VTripPlanner</Link>
          <span className="text-sm font-semibold text-slate-300">PARTNER · Khuyến mãi</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link href="/doi-tac" className="text-sm font-semibold text-slate-500 hover:text-sky-700">
          ← Trung tâm đối tác
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Promotion Management</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Khuyến mãi & Voucher</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Partner chỉ chọn Place của mình đã VERIFIED. Chương trình mới luôn PENDING
          và chỉ hoạt động sau khi ADMIN phê duyệt.
        </p>

        <PartnerPromotionManager
          eligiblePlaces={eligiblePlaces.map((place) => ({
            id: place.id,
            name: place.name,
            provinceName: place.province.name,
            categoryName: place.category.name,
          }))}
          initialPromotions={promotions.map((promotion) => ({
            id: promotion.id,
            title: promotion.title,
            description: promotion.description,
            terms: promotion.terms ?? "",
            discountType: promotion.discountType,
            discountValue: promotion.discountValue.toString(),
            maxDiscountAmount: promotion.maxDiscountAmount?.toString() ?? "",
            minimumSpend: promotion.minimumSpend?.toString() ?? "",
            startAt: promotion.startAt.toISOString(),
            endAt: promotion.endAt.toISOString(),
            totalQuantity: promotion.totalQuantity?.toString() ?? "",
            status: promotion.status,
            rejectionReason: promotion.rejectionReason ?? "",
            claimCount: promotion._count.claims,
            placeIds: promotion.places.map((item) => item.placeId),
            placeNames: promotion.places.map((item) => item.place.name),
          }))}
        />
      </div>
    </main>
  );
}
