
import {
  BadgePercent,
  Banknote,
  CalendarDays,
  CircleCheck,
  Clock3,
  MapPin,
  Store,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VoucherCodePanel } from "@/components/voucher/voucher-code-panel";
import {
  AppRole,
  PromotionStatus,
  VoucherClaimStatus,
} from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Chi tiết voucher | VTripPlanner",
  description: "Xem mã, thời hạn, điều kiện và nơi áp dụng voucher.",
};

export const dynamic = "force-dynamic";

type VoucherDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

function formatMoney(value: string): string {
  return new Intl.NumberFormat("vi-VN").format(Number(value));
}

function getVoucherState(input: {
  status: VoucherClaimStatus;
  expiresAt: Date;
  promotionStatus: PromotionStatus;
  promotionActive: boolean;
  now: Date;
}) {
  if (input.status === VoucherClaimStatus.USED) {
    return {
      label: "Đã sử dụng",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (
    input.status === VoucherClaimStatus.EXPIRED ||
    input.expiresAt <= input.now
  ) {
    return {
      label: "Đã hết hạn",
      className: "bg-red-50 text-red-700",
    };
  }

  if (
    input.promotionStatus !== PromotionStatus.APPROVED ||
    !input.promotionActive
  ) {
    return {
      label: "Chương trình tạm ngưng",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Có thể sử dụng",
    className: "bg-emerald-50 text-emerald-700",
  };
}

export default async function VoucherDetailPage({
  params,
}: VoucherDetailPageProps) {
  const access = await requireRole([AppRole.USER]);
  const resolvedParams = await params;

  if (!isUuid(resolvedParams.id)) {
    notFound();
  }

  const claim = await prisma.voucherClaim.findFirst({
    where: {
      id: resolvedParams.id,
      userId: access.applicationUserId,
    },
    select: {
      id: true,
      code: true,
      status: true,
      claimedAt: true,
      expiresAt: true,
      usedAt: true,
      promotion: {
        select: {
          title: true,
          description: true,
          terms: true,
          discountType: true,
          discountValue: true,
          maxDiscountAmount: true,
          minimumSpend: true,
          startAt: true,
          endAt: true,
          status: true,
          isActive: true,
          partner: {
            select: {
              name: true,
              phone: true,
              email: true,
              websiteUrl: true,
            },
          },
          places: {
            select: {
              place: {
                select: {
                  name: true,
                  addressLine: true,
                  ward: true,
                  phone: true,
                  websiteUrl: true,
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
              },
            },
          },
        },
      },
    },
  });

  if (!claim) {
    notFound();
  }

  const now = new Date();
  const state = getVoucherState({
    status: claim.status,
    expiresAt: claim.expiresAt,
    promotionStatus: claim.promotion.status,
    promotionActive: claim.promotion.isActive,
    now,
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            VTripPlanner
          </Link>
          <Link
            href="/voucher-cua-toi"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Ví voucher
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6">
        <Link
          href="/voucher-cua-toi"
          className="text-sm font-semibold text-slate-500 hover:text-emerald-700"
        >
          ← Voucher của tôi
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-5 text-white sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                  {claim.promotion.partner.name}
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  {claim.promotion.title}
                </h1>
                <p className="mt-3 text-lg font-black text-emerald-200">
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
              </div>

              <span
                className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${state.className}`}
              >
                {state.label}
              </span>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            <VoucherCodePanel code={claim.code} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <CalendarDays
                    aria-hidden="true"
                    className="size-4"
                  />
                  Thời hạn
                </p>
                <p className="mt-2 text-sm font-bold text-slate-800">
                  {formatDateTime(claim.promotion.startAt)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  đến {formatDateTime(claim.expiresAt)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Clock3
                    aria-hidden="true"
                    className="size-4"
                  />
                  Đã lưu
                </p>
                <p className="mt-2 text-sm font-bold text-slate-800">
                  {formatDateTime(claim.claimedAt)}
                </p>
                {claim.usedAt ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Dùng lúc {formatDateTime(claim.usedAt)}
                  </p>
                ) : null}
              </div>
            </div>

            {claim.promotion.minimumSpend ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-900">
                  Giá trị đơn tối thiểu:{" "}
                  {formatMoney(
                    claim.promotion.minimumSpend.toString(),
                  )}
                  đ
                </p>
              </div>
            ) : null}

            <div>
              <h2 className="flex items-center gap-2 text-lg font-black">
                {claim.promotion.discountType === "PERCENT" ? (
                  <BadgePercent
                    aria-hidden="true"
                    className="size-5 text-emerald-700"
                  />
                ) : (
                  <Banknote
                    aria-hidden="true"
                    className="size-5 text-emerald-700"
                  />
                )}
                Nội dung ưu đãi
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {claim.promotion.description}
              </p>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-lg font-black">
                <MapPin
                  aria-hidden="true"
                  className="size-5 text-emerald-700"
                />
                Nơi áp dụng
              </h2>

              <div className="mt-3 space-y-3">
                {claim.promotion.places.map(({ place }) => (
                  <div
                    key={`${place.name}-${place.addressLine}`}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Store
                          aria-hidden="true"
                          className="size-4"
                        />
                      </span>
                      <div>
                        <h3 className="font-black">{place.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {place.category.name} · {place.province.name}
                          {place.district
                            ? ` · ${place.district.name}`
                            : ""}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {place.addressLine}
                          {place.ward ? `, ${place.ward}` : ""}
                        </p>
                        {place.phone ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {place.phone}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-lg font-black">
                <CircleCheck
                  aria-hidden="true"
                  className="size-5 text-emerald-700"
                />
                Điều kiện sử dụng
              </h2>
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                {claim.promotion.terms ||
                  "Partner chưa cung cấp điều kiện bổ sung cho chương trình này."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Đơn vị cung cấp
              </p>
              <p className="mt-2 font-black">
                {claim.promotion.partner.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {claim.promotion.partner.phone ? (
                  <span>{claim.promotion.partner.phone}</span>
                ) : null}
                {claim.promotion.partner.email ? (
                  <span>{claim.promotion.partner.email}</span>
                ) : null}
                {claim.promotion.partner.websiteUrl ? (
                  <a
                    href={claim.promotion.partner.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    Website Partner
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
