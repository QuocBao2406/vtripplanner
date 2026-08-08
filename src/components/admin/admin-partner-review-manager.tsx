
"use client";

import {
  Building2,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type PartnerItem = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  phone: string;
  email: string;
  websiteUrl: string;
  taxCode: string;
  businessLicenseUrl: string;
  approvalStatus: string;
  rejectionReason: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerName: string;
};

type AdminPartnerReviewManagerProps = {
  initialPartners: PartnerItem[];
};

type ApiResponse = {
  message?: string;
};

const STATUS_LABELS: Record<string, string> = {
  NOT_APPLIED: "Chưa gửi",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  SUSPENDED: "Tạm ngưng",
};

function formatTime(value: string | null): string {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function statusClassName(status: string): string {
  if (status === "APPROVED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "PENDING") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  if (status === "SUSPENDED") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-slate-100 text-slate-500";
}

export function AdminPartnerReviewManager({
  initialPartners,
}: AdminPartnerReviewManagerProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pendingCount = useMemo(
    () =>
      initialPartners.filter(
        (partner) => partner.approvalStatus === "PENDING",
      ).length,
    [initialPartners],
  );

  async function review(
    partner: PartnerItem,
    decision: "APPROVE" | "REJECT",
  ) {
    if (decision === "REJECT" && rejectionReason.trim().length < 5) {
      setError("Vui lòng nhập lý do từ chối ít nhất 5 ký tự.");
      return;
    }

    if (
      decision === "APPROVE" &&
      !window.confirm(`Phê duyệt Partner "${partner.name}"?`)
    ) {
      return;
    }

    setBusyId(partner.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/partners/review", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerId: partner.id,
          decision,
          rejectionReason:
            decision === "REJECT" ? rejectionReason : "",
        }),
      });

      let payload: ApiResponse = {};

      try {
        payload = (await response.json()) as ApiResponse;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        setError(payload.message ?? "Không thể xét duyệt Partner.");
        return;
      }

      setMessage(
        payload.message ??
          (decision === "APPROVE"
            ? "Đã phê duyệt Partner."
            : "Đã từ chối hồ sơ Partner."),
      );
      setRejectingId(null);
      setRejectionReason("");
      router.refresh();
    } catch {
      setError("Không thể kết nối để xét duyệt Partner.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">
            Tổng quan
          </p>
          <h2 className="mt-1 text-lg font-black">
            {initialPartners.length.toLocaleString("vi-VN")} hồ sơ Partner
          </h2>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
          {pendingCount.toLocaleString("vi-VN")} đang chờ duyệt
        </span>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      {initialPartners.length > 0 ? (
        <div className="mt-4 space-y-3">
          {initialPartners.map((partner) => {
            const isPending = partner.approvalStatus === "PENDING";
            const isBusy = busyId === partner.id;
            const isRejecting = rejectingId === partner.id;

            return (
              <article
                key={partner.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2
                        aria-hidden="true"
                        className="size-4 text-violet-600"
                      />
                      <h3 className="font-black text-slate-950">
                        {partner.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusClassName(
                          partner.approvalStatus,
                        )}`}
                      >
                        {STATUS_LABELS[partner.approvalStatus] ??
                          partner.approvalStatus}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {partner.type.replaceAll("_", " ")} · Chủ tài khoản:{" "}
                      {partner.ownerName}
                      {partner.ownerEmail
                        ? ` · ${partner.ownerEmail}`
                        : ""}
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {partner.description || "Chưa có mô tả."}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      {partner.email ? (
                        <span>Email: {partner.email}</span>
                      ) : null}
                      {partner.phone ? (
                        <span>Điện thoại: {partner.phone}</span>
                      ) : null}
                      {partner.taxCode ? (
                        <span>MST: {partner.taxCode}</span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                      {partner.websiteUrl ? (
                        <a
                          href={partner.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                        >
                          Website
                          <ExternalLink
                            aria-hidden="true"
                            className="size-3"
                          />
                        </a>
                      ) : null}
                      {partner.businessLicenseUrl ? (
                        <a
                          href={partner.businessLicenseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-violet-700 hover:underline"
                        >
                          Hồ sơ pháp lý
                          <ExternalLink
                            aria-hidden="true"
                            className="size-3"
                          />
                        </a>
                      ) : null}
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      Gửi: {formatTime(partner.submittedAt)}
                      {partner.reviewedAt
                        ? ` · Xét duyệt: ${formatTime(
                            partner.reviewedAt,
                          )}`
                        : ""}
                      {partner.reviewerName
                        ? ` · Bởi: ${partner.reviewerName}`
                        : ""}
                    </p>

                    {partner.rejectionReason ? (
                      <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
                        Lý do từ chối: {partner.rejectionReason}
                      </p>
                    ) : null}
                  </div>

                  {isPending ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void review(partner, "APPROVE");
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <Check aria-hidden="true" className="size-4" />
                        Phê duyệt
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setRejectingId(
                            isRejecting ? null : partner.id,
                          );
                          setRejectionReason("");
                          setError("");
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 px-3.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <X aria-hidden="true" className="size-4" />
                        Từ chối
                      </button>
                    </div>
                  ) : null}
                </div>

                {isPending && isRejecting ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Lý do từ chối
                      <textarea
                        value={rejectionReason}
                        maxLength={1000}
                        rows={3}
                        onChange={(event) => {
                          setRejectionReason(event.target.value);
                        }}
                        placeholder="Nêu rõ thông tin cần bổ sung hoặc lý do hồ sơ chưa đạt..."
                        className="mt-2 w-full rounded-xl border border-red-200 px-3.5 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                      />
                    </label>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={
                          isBusy ||
                          rejectionReason.trim().length < 5
                        }
                        onClick={() => {
                          void review(partner, "REJECT");
                        }}
                        className="min-h-10 rounded-xl bg-red-700 px-4 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {isBusy
                          ? "Đang xử lý..."
                          : "Xác nhận từ chối"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có hồ sơ Partner nào.
        </div>
      )}
    </section>
  );
}
