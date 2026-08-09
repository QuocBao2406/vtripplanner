import type { Metadata } from "next";
import Link from "next/link";

import { AdminPromotionReviewManager } from "@/components/admin/admin-promotion-review-manager";
import { AppRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Duyệt khuyến mãi | VTripPlanner Admin",
  description: "ADMIN xét duyệt chương trình ưu đãi của Partner.",
};

export const dynamic = "force-dynamic";

const priority: Record<string, number> = {
  PENDING: 0,
  REJECTED: 1,
  APPROVED: 2,
  SUSPENDED: 3,
  DRAFT: 4,
};

export default async function AdminPromotionPage() {
  await requireRole([AppRole.ADMIN]);

  const promotions = await prisma.promotion.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true, title: true, description: true, terms: true,
      discountType: true, discountValue: true, maxDiscountAmount: true,
      minimumSpend: true, startAt: true, endAt: true, totalQuantity: true,
      status: true, rejectionReason: true, reviewedAt: true, updatedAt: true,
      partner: { select: { name: true, owner: { select: { email: true } } } },
      reviewedBy: { select: { email: true, profile: { select: { displayName: true } } } },
      places: { select: { place: { select: { name: true, province: { select: { name: true } } } } } },
      _count: { select: { claims: true } },
    },
  });

  const sorted = [...promotions].sort((a, b) => {
    const diff = (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
    return diff || b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="font-black">VTripPlanner</Link>
          <span className="text-sm font-semibold text-slate-300">ADMIN · Khuyến mãi</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Link href="/quan-tri" className="text-sm font-semibold text-slate-500 hover:text-violet-700">
          ← Dashboard
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Promotion Approval</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Duyệt khuyến mãi & Voucher</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Chỉ chương trình PENDING mới được xét duyệt. APPROVED mới được bật hoạt động.
          Phần user claim và Ví voucher sẽ được nối ở 7.16H.
        </p>

        <AdminPromotionReviewManager
          initialPromotions={sorted.map((promotion) => ({
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
            totalQuantity: promotion.totalQuantity,
            status: promotion.status,
            rejectionReason: promotion.rejectionReason ?? "",
            claimCount: promotion._count.claims,
            partnerName: promotion.partner.name,
            partnerEmail: promotion.partner.owner.email ?? "",
            reviewerName: promotion.reviewedBy?.profile?.displayName ?? promotion.reviewedBy?.email ?? "",
            reviewedAt: promotion.reviewedAt?.toISOString() ?? null,
            places: promotion.places.map((item) => `${item.place.name} (${item.place.province.name})`),
          }))}
        />
      </div>
    </main>
  );
}
