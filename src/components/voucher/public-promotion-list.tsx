
"use client";

import {
  BadgePercent,
  Banknote,
  CalendarDays,
  MapPin,
  TicketCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PromotionItem = {
  id: string;
  title: string;
  description: string;
  terms: string;
  discountType: string;
  discountValue: string;
  maxDiscountAmount: string;
  minimumSpend: string;
  startAt: string;
  endAt: string;
  totalQuantity: number | null;
  claimedCount: number;
  partnerName: string;
  viewerClaimId: string | null;
  places: Array<{
    id: string;
    name: string;
    categoryName: string;
    provinceName: string;
    addressLine: string;
  }>;
};

type PublicPromotionListProps = {
  promotions: PromotionItem[];
};

type ClaimResponse = {
  message?: string;
  claim?: {
    id: string;
  };
};

function formatMoney(value: string): string {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("vi-VN").format(parsed)
    : value;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function getDiscountText(item: PromotionItem): string {
  if (item.discountType === "PERCENT") {
    const suffix = item.maxDiscountAmount
      ? ` · tối đa ${formatMoney(item.maxDiscountAmount)}đ`
      : "";

    return `Giảm ${item.discountValue}%${suffix}`;
  }

  return `Giảm ${formatMoney(item.discountValue)}đ`;
}

export function PublicPromotionList({
  promotions,
}: PublicPromotionListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function claimVoucher(promotionId: string) {
    setBusyId(promotionId);
    setError("");

    try {
      const response = await fetch("/api/vouchers/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotionId,
        }),
      });

      let payload: ClaimResponse = {};

      try {
        payload = (await response.json()) as ClaimResponse;
      } catch {
        payload = {};
      }

      if (response.status === 401) {
        router.push(
          "/dang-nhap?message=" +
            encodeURIComponent(
              "Vui lòng đăng nhập để lưu voucher.",
            ),
        );
        return;
      }

      if (response.status === 403) {
        router.push("/khong-co-quyen?required=USER");
        return;
      }

      if (!response.ok) {
        setError(payload.message ?? "Không thể lưu voucher.");
        return;
      }

      if (payload.claim?.id) {
        router.push(`/voucher-cua-toi/${payload.claim.id}`);
        router.refresh();
        return;
      }

      setError("Voucher đã được lưu nhưng không tìm thấy mã để mở.");
    } catch {
      setError("Không thể kết nối để lưu voucher.");
    } finally {
      setBusyId(null);
    }
  }

  if (promotions.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Hiện chưa có ưu đãi nào đang áp dụng. Các chương trình đã hết hạn hoặc
        chưa được ADMIN duyệt sẽ không xuất hiện ở đây.
      </div>
    );
  }

  return (
    <div className="mt-5">
      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {promotions.map((item) => {
          const remaining =
            item.totalQuantity === null
              ? null
              : Math.max(
                  item.totalQuantity - item.claimedCount,
                  0,
                );

          const soldOut =
            remaining !== null && remaining <= 0;
          const isBusy = busyId === item.id;

          return (
            <article
              key={item.id}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  {item.discountType === "PERCENT" ? (
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

                {item.viewerClaimId ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Đã lưu
                  </span>
                ) : soldOut ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Hết lượt
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Đang mở
                  </span>
                )}
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                {item.partnerName}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                {item.title}
              </h3>

              <p className="mt-2 text-base font-black text-emerald-700">
                {getDiscountText(item)}
              </p>

              {item.minimumSpend ? (
                <p className="mt-1 text-xs text-slate-500">
                  Đơn tối thiểu{" "}
                  {formatMoney(item.minimumSpend)}đ
                </p>
              ) : null}

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>

              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
                <p className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <CalendarDays
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-slate-400"
                  />
                  {formatDate(item.startAt)} →{" "}
                  {formatDate(item.endAt)}
                </p>

                <p className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-slate-400"
                  />
                  {item.places
                    .map(
                      (place) =>
                        `${place.name} · ${place.provinceName}`,
                    )
                    .join(", ")}
                </p>
              </div>

              <div className="mt-auto pt-5">
                {remaining !== null ? (
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Còn {remaining.toLocaleString("vi-VN")} voucher
                  </p>
                ) : (
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Không giới hạn số lượt ở chương trình này
                  </p>
                )}

                {item.viewerClaimId ? (
                  <Link
                    href={`/voucher-cua-toi/${item.viewerClaimId}`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
                  >
                    <TicketCheck
                      aria-hidden="true"
                      className="size-4"
                    />
                    Xem voucher của tôi
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={soldOut || isBusy}
                    onClick={() => {
                      void claimVoucher(item.id);
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <TicketCheck
                      aria-hidden="true"
                      className="size-4"
                    />
                    {isBusy
                      ? "Đang lưu..."
                      : soldOut
                        ? "Đã hết voucher"
                        : "Lưu voucher"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
