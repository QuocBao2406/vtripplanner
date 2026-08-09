"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Promotion = {
  id: string; title: string; description: string; terms: string;
  discountType: "PERCENT" | "FIXED_AMOUNT"; discountValue: string;
  maxDiscountAmount: string; minimumSpend: string; startAt: string; endAt: string;
  totalQuantity: number | null; status: string; rejectionReason: string;
  claimCount: number; partnerName: string; partnerEmail: string;
  reviewerName: string; reviewedAt: string | null; places: string[];
};
type Props = { initialPromotions: Promotion[] };
type ApiResponse = { message?: string };

function time(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}
function money(value: string) { return Number(value).toLocaleString("vi-VN"); }
function label(status: string) {
  return status === "APPROVED" ? "Đã duyệt" :
    status === "PENDING" ? "Chờ duyệt" :
    status === "REJECTED" ? "Từ chối" : status;
}

export function AdminPromotionReviewManager({ initialPromotions }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useMemo(() => initialPromotions.filter((p) => p.status === "PENDING").length, [initialPromotions]);

  async function review(promotion: Promotion, decision: "APPROVE" | "REJECT") {
    if (decision === "REJECT" && reason.trim().length < 5) { setError("Lý do từ chối cần ít nhất 5 ký tự."); return; }
    if (decision === "APPROVE" && !window.confirm(`Phê duyệt "${promotion.title}"?`)) return;

    setBusyId(promotion.id); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/promotions/review", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotionId: promotion.id, decision, rejectionReason: decision === "REJECT" ? reason : "" }),
      });
      const payload = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok) { setError(payload.message ?? "Không thể xét duyệt."); return; }
      setMessage(payload.message ?? "Đã cập nhật chương trình.");
      setRejectingId(null); setReason(""); router.refresh();
    } catch { setError("Không thể kết nối để xét duyệt."); }
    finally { setBusyId(null); }
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-black">{initialPromotions.length} chương trình</h2>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">{pending} chờ duyệt</span>
      </div>

      {message ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {initialPromotions.map((promotion) => {
          const isPending = promotion.status === "PENDING";
          const rejecting = rejectingId === promotion.id;
          return <article key={promotion.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{promotion.title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{label(promotion.status)}</span></div>
                <p className="mt-1 text-xs text-slate-500">Partner: {promotion.partnerName}{promotion.partnerEmail ? ` · ${promotion.partnerEmail}` : ""}</p>
                <p className="mt-2 text-sm font-bold text-violet-800">{promotion.discountType === "PERCENT" ? `Giảm ${promotion.discountValue}%` : `Giảm ${money(promotion.discountValue)}đ`}{promotion.maxDiscountAmount ? ` · tối đa ${money(promotion.maxDiscountAmount)}đ` : ""}{promotion.minimumSpend ? ` · đơn từ ${money(promotion.minimumSpend)}đ` : ""}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{promotion.description}</p>
                <p className="mt-2 text-xs text-slate-500">Áp dụng: {promotion.places.join(", ")}</p>
                <p className="mt-2 text-xs text-slate-400">{time(promotion.startAt)} → {time(promotion.endAt)} · {promotion.totalQuantity ?? "Không giới hạn"} voucher · {promotion.claimCount} đã claim</p>
                {promotion.terms ? <details className="mt-2 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold">Điều kiện sử dụng</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5">{promotion.terms}</p></details> : null}
                {promotion.rejectionReason ? <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-700">Lý do: {promotion.rejectionReason}</p> : null}
              </div>

              {isPending ? <div className="flex shrink-0 gap-2">
                <button disabled={busyId === promotion.id} onClick={() => void review(promotion, "APPROVE")} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white"><Check className="size-4" />Phê duyệt</button>
                <button disabled={busyId === promotion.id} onClick={() => { setRejectingId(rejecting ? null : promotion.id); setReason(""); setError(""); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-700"><X className="size-4" />Từ chối</button>
              </div> : null}
            </div>

            {isPending && rejecting ? <div className="mt-4 border-t pt-4">
              <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do từ chối..." className="w-full rounded-xl border border-red-200 p-3 text-sm" />
              <div className="mt-2 text-right"><button disabled={reason.trim().length < 5 || busyId === promotion.id} onClick={() => void review(promotion, "REJECT")} className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white disabled:bg-slate-300">Xác nhận từ chối</button></div>
            </div> : null}
          </article>;
        })}
      </div>
    </section>
  );
}
