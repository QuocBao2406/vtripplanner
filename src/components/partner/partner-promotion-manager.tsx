"use client";

import { Pencil, Plus, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type PlaceOption = { id: string; name: string; provinceName: string; categoryName: string };
type PromotionItem = {
  id: string; title: string; description: string; terms: string;
  discountType: "PERCENT" | "FIXED_AMOUNT"; discountValue: string;
  maxDiscountAmount: string; minimumSpend: string; startAt: string; endAt: string;
  totalQuantity: string; status: string; rejectionReason: string; claimCount: number;
  placeIds: string[]; placeNames: string[];
};
type FormState = Omit<PromotionItem, "id" | "status" | "rejectionReason" | "claimCount" | "placeNames"> & { id: string | null };
type Props = { eligiblePlaces: PlaceOption[]; initialPromotions: PromotionItem[] };
type ApiResponse = { message?: string };

function localValue(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function blankForm(): FormState {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return {
    id: null, title: "", description: "", terms: "", discountType: "PERCENT",
    discountValue: "", maxDiscountAmount: "", minimumSpend: "",
    startAt: localValue(start.toISOString()), endAt: localValue(end.toISOString()),
    totalQuantity: "", placeIds: [],
  };
}

function editable(status: string) {
  return ["DRAFT", "PENDING", "REJECTED"].includes(status);
}

function statusLabel(status: string) {
  return status === "APPROVED" ? "Đã duyệt" :
    status === "PENDING" ? "Chờ duyệt" :
    status === "REJECTED" ? "Cần chỉnh sửa" : status;
}

export function PartnerPromotionManager({ eligiblePlaces, initialPromotions }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blankForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const value = Number(form.discountValue);
    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    return form.title.trim().length >= 3 && form.description.trim().length >= 20 &&
      Number.isFinite(value) && value > 0 &&
      (form.discountType !== "PERCENT" || value <= 100) &&
      end > start && form.placeIds.length > 0 && !busy;
  }, [form, busy]);

  function edit(item: PromotionItem) {
    if (!editable(item.status)) return;
    setForm({
      id: item.id, title: item.title, description: item.description, terms: item.terms,
      discountType: item.discountType, discountValue: item.discountValue,
      maxDiscountAmount: item.maxDiscountAmount, minimumSpend: item.minimumSpend,
      startAt: localValue(item.startAt), endAt: localValue(item.endAt),
      totalQuantity: item.totalQuantity, placeIds: item.placeIds,
    });
    setMessage(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/partner/promotions", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          maxDiscountAmount: form.discountType === "PERCENT" ? form.maxDiscountAmount : "",
        }),
      });
      const payload = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok) { setError(payload.message ?? "Không thể lưu ưu đãi."); return; }
      setMessage(payload.message ?? "Đã gửi ADMIN xét duyệt.");
      setForm(blankForm()); router.refresh();
    } catch {
      setError("Không thể kết nối để lưu ưu đãi.");
    } finally { setBusy(false); }
  }

  const input = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-sky-500";

  return (
    <div className="mt-6 grid items-start gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-bold uppercase text-sky-700">{form.id ? "Chỉnh sửa" : "Chương trình mới"}</p>
          <h2 className="mt-1 text-lg font-black">{form.id ? "Cập nhật & gửi lại" : "Tạo khuyến mãi"}</h2></div>
          {form.id ? <button type="button" onClick={() => setForm(blankForm())} className="rounded-xl border p-2"><X className="size-4" /></button> : null}
        </div>

        {message ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {eligiblePlaces.length === 0 ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Chưa có Place VERIFIED đang hoạt động.</p> : null}

        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label className="block text-sm font-semibold">Tên chương trình
            <input className={input} maxLength={200} value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} />
          </label>
          <label className="block text-sm font-semibold">Mô tả
            <textarea className={`${input} py-3`} rows={4} maxLength={2000} value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Loại giảm
              <select className={input} value={form.discountType} onChange={(e) => setForm((v) => ({ ...v, discountType: e.target.value as FormState["discountType"] }))}>
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED_AMOUNT">Số tiền (VND)</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Giá trị giảm
              <input className={input} type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => setForm((v) => ({ ...v, discountValue: e.target.value }))} />
            </label>
          </div>

          {form.discountType === "PERCENT" ? <label className="block text-sm font-semibold">Giảm tối đa (VND)
            <input className={input} type="number" min="0" value={form.maxDiscountAmount} onChange={(e) => setForm((v) => ({ ...v, maxDiscountAmount: e.target.value }))} />
          </label> : null}

          <label className="block text-sm font-semibold">Chi tiêu tối thiểu (VND)
            <input className={input} type="number" min="0" value={form.minimumSpend} onChange={(e) => setForm((v) => ({ ...v, minimumSpend: e.target.value }))} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Bắt đầu
              <input className={input} type="datetime-local" value={form.startAt} onChange={(e) => setForm((v) => ({ ...v, startAt: e.target.value }))} />
            </label>
            <label className="text-sm font-semibold">Kết thúc
              <input className={input} type="datetime-local" value={form.endAt} onChange={(e) => setForm((v) => ({ ...v, endAt: e.target.value }))} />
            </label>
          </div>

          <label className="block text-sm font-semibold">Số lượng voucher
            <input className={input} type="number" min="1" value={form.totalQuantity} placeholder="Để trống = không giới hạn" onChange={(e) => setForm((v) => ({ ...v, totalQuantity: e.target.value }))} />
          </label>

          <fieldset className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-bold">Nơi áp dụng</legend>
            <div className="mt-2 space-y-2">
              {eligiblePlaces.map((place) => <label key={place.id} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <input type="checkbox" checked={form.placeIds.includes(place.id)} onChange={() => setForm((v) => ({ ...v, placeIds: v.placeIds.includes(place.id) ? v.placeIds.filter((id) => id !== place.id) : [...v.placeIds, place.id] }))} />
                <span><b className="block text-sm">{place.name}</b><span className="text-xs text-slate-500">{place.categoryName} · {place.provinceName}</span></span>
              </label>)}
            </div>
          </fieldset>

          <label className="block text-sm font-semibold">Điều kiện sử dụng
            <textarea className={`${input} py-3`} rows={4} maxLength={3000} value={form.terms} onChange={(e) => setForm((v) => ({ ...v, terms: e.target.value }))} />
          </label>

          <button disabled={!canSubmit || eligiblePlaces.length === 0} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white disabled:bg-slate-300">
            {form.id ? <Send className="size-4" /> : <Plus className="size-4" />}
            {busy ? "Đang gửi..." : form.id ? "Cập nhật & gửi lại" : "Gửi ADMIN xét duyệt"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-black">{initialPromotions.length} chương trình</h2>
        <div className="mt-3 space-y-3">
          {initialPromotions.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{item.title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{statusLabel(item.status)}</span></div>
              <p className="mt-2 text-sm font-bold text-sky-800">{item.discountType === "PERCENT" ? `Giảm ${item.discountValue}%` : `Giảm ${Number(item.discountValue).toLocaleString("vi-VN")}đ`}</p>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              <p className="mt-2 text-xs text-slate-500">Áp dụng: {item.placeNames.join(", ")} · {item.claimCount} lượt claim</p>
              {item.rejectionReason ? <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-700">ADMIN: {item.rejectionReason}</p> : null}</div>
              {editable(item.status) ? <button type="button" onClick={() => edit(item)} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Pencil className="size-3.5" />Sửa</button> : null}
            </div>
          </article>)}
        </div>
      </section>
    </div>
  );
}
