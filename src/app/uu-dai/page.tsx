
import type { Metadata } from "next";
import Link from "next/link";

import { PublicPromotionList } from "@/components/voucher/public-promotion-list";
import {
  PartnerApprovalStatus,
  PlaceVerificationStatus,
  PromotionStatus,
} from "@/generated/prisma/enums";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Ưu đãi du lịch | VTripPlanner",
  description:
    "Khám phá khuyến mãi từ các đối tác đã được VTripPlanner phê duyệt.",
};

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const now = new Date();
  const authorization = await getCurrentAuthorization();

  const viewerUserId =
    authorization.status === "anonymous" ||
    authorization.status === "inactive"
      ? null
      : authorization.access.applicationUserId;

  const promotions = await prisma.promotion.findMany({
    where: {
      status: PromotionStatus.APPROVED,
      isActive: true,
      deletedAt: null,
      startAt: {
        lte: now,
      },
      endAt: {
        gt: now,
      },
      partner: {
        approvalStatus: PartnerApprovalStatus.APPROVED,
        deletedAt: null,
      },
      places: {
        some: {
          place: {
            verificationStatus: PlaceVerificationStatus.VERIFIED,
            isActive: true,
            deletedAt: null,
          },
        },
      },
    },
    orderBy: [
      {
        endAt: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 50,
    select: {
      id: true,
      title: true,
      description: true,
      terms: true,
      discountType: true,
      discountValue: true,
      maxDiscountAmount: true,
      minimumSpend: true,
      startAt: true,
      endAt: true,
      totalQuantity: true,
      partner: {
        select: {
          name: true,
        },
      },
      places: {
        where: {
          place: {
            verificationStatus: PlaceVerificationStatus.VERIFIED,
            isActive: true,
            deletedAt: null,
          },
        },
        select: {
          place: {
            select: {
              id: true,
              name: true,
              addressLine: true,
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
          },
        },
      },
      _count: {
        select: {
          claims: true,
        },
      },
    },
  });

  const viewerClaims =
    viewerUserId && promotions.length > 0
      ? await prisma.voucherClaim.findMany({
          where: {
            userId: viewerUserId,
            promotionId: {
              in: promotions.map((promotion) => promotion.id),
            },
          },
          select: {
            id: true,
            promotionId: true,
          },
        })
      : [];

  const claimByPromotionId = new Map(
    viewerClaims.map((claim) => [
      claim.promotionId,
      claim.id,
    ]),
  );

  const isInactive = authorization.status === "inactive";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight text-slate-950">
            VTripPlanner
          </Link>

          <div className="flex items-center gap-2">
            {viewerUserId ? (
              <Link
                href="/voucher-cua-toi"
                className="rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                Voucher của tôi
              </Link>
            ) : authorization.status === "anonymous" ? (
              <Link
                href="/dang-nhap"
                className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Đăng nhập
              </Link>
            ) : (
              <Link
                href="/khong-co-quyen?reason=inactive"
                className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-bold text-amber-800"
              >
                Tài khoản bị khóa
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center rounded-xl px-1 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
        >
          ← Trở về trang chủ
        </Link>
      </div>

      <section className="mt-2 border-b border-slate-200 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
            VTripPlanner Deals
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            Ưu đãi cho chuyến đi tiếp theo
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50 sm:text-base">
            Chỉ hiển thị chương trình đã được ADMIN phê duyệt, còn thời hạn
            và có địa điểm áp dụng đang hoạt động. Khi lưu voucher, bạn nhận
            một mã riêng gắn với tài khoản của mình.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
              Đang áp dụng
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {promotions.length.toLocaleString("vi-VN")} ưu đãi
            </h2>
          </div>

          <p className="text-sm text-slate-500">
            Mỗi tài khoản chỉ nhận một mã cho mỗi chương trình.
          </p>
        </div>

        {isInactive ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Bạn vẫn có thể xem ưu đãi, nhưng tài khoản đang bị khóa nên chưa
            thể lưu voucher.
          </p>
        ) : null}

        <PublicPromotionList
          promotions={promotions.map((promotion) => ({
            id: promotion.id,
            title: promotion.title,
            description: promotion.description,
            terms: promotion.terms ?? "",
            discountType: promotion.discountType,
            discountValue: promotion.discountValue.toString(),
            maxDiscountAmount:
              promotion.maxDiscountAmount?.toString() ?? "",
            minimumSpend: promotion.minimumSpend?.toString() ?? "",
            startAt: promotion.startAt.toISOString(),
            endAt: promotion.endAt.toISOString(),
            totalQuantity: promotion.totalQuantity,
            claimedCount: promotion._count.claims,
            partnerName: promotion.partner.name,
            viewerClaimId:
              claimByPromotionId.get(promotion.id) ?? null,
            places: promotion.places.map(({ place }) => ({
              id: place.id,
              name: place.name,
              categoryName: place.category.name,
              provinceName: place.province.name,
              addressLine: place.addressLine,
            })),
          }))}
        />
      </section>
    </main>
  );
}
