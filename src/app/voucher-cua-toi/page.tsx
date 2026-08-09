
import {
  BadgePercent,
  Banknote,
  CalendarDays,
  MapPin,
  TicketCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  AppRole,
  PromotionStatus,
  VoucherClaimStatus,
} from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Voucher của tôi | VTripPlanner",
  description: "Các voucher đã lưu theo tài khoản VTripPlanner.",
};

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

function formatMoney(value: string): string {
  return new Intl.NumberFormat("vi-VN").format(Number(value));
}

function getState(input: {
  claimStatus: VoucherClaimStatus;
  expiresAt: Date;
  promotionStatus: PromotionStatus;
  promotionActive: boolean;
  now: Date;
}): {
  label: string;
  className: string;
} {
  if (input.claimStatus === VoucherClaimStatus.USED) {
    return {
      label: "Đã sử dụng",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (
    input.claimStatus === VoucherClaimStatus.EXPIRED ||
    input.expiresAt <= input.now
  ) {
    return {
      label: "Hết hạn",
      className: "bg-red-50 text-red-700",
    };
  }

  if (
    input.promotionStatus !== PromotionStatus.APPROVED ||
    !input.promotionActive
  ) {
    return {
      label: "Tạm ngưng",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Có thể sử dụng",
    className: "bg-emerald-50 text-emerald-700",
  };
}

export default async function MyVouchersPage() {
  const access = await requireRole([AppRole.USER]);
  const now = new Date();

  const claims = await prisma.voucherClaim.findMany({
    where: {
      userId: access.applicationUserId,
    },
    orderBy: {
      claimedAt: "desc",
    },
    select: {
      id: true,
      status: true,
      claimedAt: true,
      expiresAt: true,
      usedAt: true,
      promotion: {
        select: {
          title: true,
          discountType: true,
          discountValue: true,
          maxDiscountAmount: true,
          status: true,
          isActive: true,
          partner: {
            select: {
              name: true,
            },
          },
          places: {
            select: {
              place: {
                select: {
                  name: true,
                  province: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            VTripPlanner
          </Link>
          <Link
            href="/uu-dai"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Khám phá ưu đãi
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 hover:text-emerald-700"
        >
          ← Trở về trang chủ
        </Link>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            My Voucher Wallet
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Voucher của tôi
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mỗi voucher bên dưới là một claim riêng gắn với tài khoản của bạn.
            Bấm vào voucher để xem mã, điều kiện và nơi áp dụng.
          </p>
        </div>

        {claims.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {claims.map((claim) => {
              const state = getState({
                claimStatus: claim.status,
                expiresAt: claim.expiresAt,
                promotionStatus: claim.promotion.status,
                promotionActive: claim.promotion.isActive,
                now,
              });

              return (
                <Link
                  key={claim.id}
                  href={`/voucher-cua-toi/${claim.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      {claim.promotion.discountType === "PERCENT" ? (
                        <BadgePercent
                          aria-hidden="true"
                          className="size-5"
                        />
                      ) : (
                        <Banknote
                          aria-hidden="true"
                          className="size-5"
                        />
                      )}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${state.className}`}
                    >
                      {state.label}
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {claim.promotion.partner.name}
                  </p>
                  <h2 className="mt-1 text-lg font-black group-hover:text-emerald-800">
                    {claim.promotion.title}
                  </h2>

                  <p className="mt-2 text-sm font-black text-emerald-700">
                    {claim.promotion.discountType === "PERCENT"
                      ? `Giảm ${claim.promotion.discountValue.toString()}%${
                          claim.promotion.maxDiscountAmount
                            ? ` · tối đa ${formatMoney(
                                claim.promotion.maxDiscountAmount.toString(),
                              )}đ`
                            : ""
                        }`
                      : `Giảm ${formatMoney(
                          claim.promotion.discountValue.toString(),
                        )}đ`}
                  </p>

                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="flex items-start gap-2">
                      <CalendarDays
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-slate-400"
                      />
                      Hạn dùng: {formatDate(claim.expiresAt)}
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-slate-400"
                      />
                      {claim.promotion.places
                        .map(
                          ({ place }) =>
                            `${place.name} · ${place.province.name}`,
                        )
                        .join(", ")}
                    </p>
                  </div>

                  <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <TicketCheck
                      aria-hidden="true"
                      className="size-4"
                    />
                    Xem mã voucher →
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <TicketCheck
              aria-hidden="true"
              className="mx-auto size-8 text-slate-300"
            />
            <h2 className="mt-3 font-black">
              Bạn chưa lưu voucher nào
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Khám phá các ưu đãi đang hoạt động và lưu mã riêng cho chuyến đi
              của bạn.
            </p>
            <Link
              href="/uu-dai"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Xem ưu đãi
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
