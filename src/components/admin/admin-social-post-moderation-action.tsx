"use client";

import {
  Eye,
  EyeOff,
  LoaderCircle,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ModerationActionType = "HIDE" | "UNHIDE" | "DELETE" | "RESTORE";

type ModerationResponse = {
  message?: string;
};

type AdminSocialPostModerationActionProps = {
  postId: string;
  postLabel: string;
  status: "PUBLISHED" | "HIDDEN" | "DRAFT";
  deletedAt: Date | string | null;
};

const MAX_REASON_LENGTH = 500;
const MIN_DELETE_REASON_LENGTH = 5;

export function AdminSocialPostModerationAction({
  postId,
  postLabel,
  status,
  deletedAt,
}: AdminSocialPostModerationActionProps) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ModerationActionType | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDeleted = Boolean(deletedAt);
  const isHidden = status === "HIDDEN";
  const isPublished = status === "PUBLISHED";

  const normalizedReason = reason.trim();
  const canSubmit =
    !isPending &&
    (activeModal !== "DELETE" || normalizedReason.length >= MIN_DELETE_REASON_LENGTH);

  function openModal(action: ModerationActionType) {
    setActiveModal(action);
    setReason("");
    setMessage(null);
  }

  function closeModal() {
    if (isPending) return;
    setActiveModal(null);
    setReason("");
    setMessage(null);
  }

  async function submitModeration() {
    if (!activeModal || !canSubmit) return;

    setMessage(null);

    try {
      const response = await fetch("/api/admin/social-posts/moderate", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          action: activeModal,
          reason: normalizedReason || undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ModerationResponse;

      if (!response.ok) {
        setMessage(payload.message ?? "Không thể xử lý yêu cầu moderation.");
        return;
      }

      closeModal();

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        {isDeleted ? (
          <button
            type="button"
            onClick={() => openModal("RESTORE")}
            disabled={isPending}
            className="inline-flex h-9 min-w-[90px] items-center justify-center gap-1.5 whitespace-nowrap select-none rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-xs font-semibold text-blue-700 shadow-xs transition-all hover:bg-blue-100 hover:border-blue-300 active:scale-95 disabled:opacity-50 shrink-0"
          >
            <RotateCcw aria-hidden="true" className="size-3.5 shrink-0" />
            Khôi phục bài
          </button>
        ) : (
          <>
            {isPublished && (
              <button
                type="button"
                onClick={() => openModal("HIDE")}
                disabled={isPending}
                className="inline-flex h-9 min-w-[80px] items-center justify-center gap-1.5 whitespace-nowrap select-none rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-xs font-semibold text-amber-800 shadow-xs transition-all hover:bg-amber-100 hover:border-amber-300 active:scale-95 disabled:opacity-50 shrink-0"
              >
                <EyeOff aria-hidden="true" className="size-3.5 shrink-0" />
                Ẩn bài
              </button>
            )}

            {isHidden && (
              <button
                type="button"
                onClick={() => openModal("UNHIDE")}
                disabled={isPending}
                className="inline-flex h-9 min-w-[85px] items-center justify-center gap-1.5 whitespace-nowrap select-none rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 shadow-xs transition-all hover:bg-emerald-100 hover:border-emerald-300 active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Eye aria-hidden="true" className="size-3.5 shrink-0" />
                Hiện bài
              </button>
            )}

            <button
              type="button"
              onClick={() => openModal("DELETE")}
              disabled={isPending}
              className="inline-flex h-9 min-w-[80px] items-center justify-center gap-1.5 whitespace-nowrap select-none rounded-xl border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-700 shadow-xs transition-all hover:bg-red-100 hover:border-red-300 active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Trash2 aria-hidden="true" className="size-3.5 shrink-0" />
              Xóa bài
            </button>
          </>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
                {activeModal === "HIDE" && (
                  <>
                    <EyeOff className="size-5 text-amber-600" />
                    Ẩn bài viết
                  </>
                )}
                {activeModal === "UNHIDE" && (
                  <>
                    <Eye className="size-5 text-emerald-600" />
                    Hiển thị lại bài viết
                  </>
                )}
                {activeModal === "DELETE" && (
                  <>
                    <Trash2 className="size-5 text-red-600" />
                    Xóa bài viết
                  </>
                )}
                {activeModal === "RESTORE" && (
                  <>
                    <RotateCcw className="size-5 text-blue-600" />
                    Khôi phục bài viết
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Bài viết được chọn
              </p>
              <p className="mt-1 line-clamp-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800">
                {postLabel || "Bài viết không có tiêu đề"}
              </p>

              <p className="mt-3 text-xs leading-5 text-slate-600">
                {activeModal === "HIDE" &&
                  "Bài viết sẽ bị ẩn khỏi bảng tin cộng đồng. Người dùng thông thường sẽ không nhìn thấy bài này."}
                {activeModal === "UNHIDE" &&
                  "Bài viết sẽ được mở lại và xuất hiện công khai trên bảng tin cộng đồng."}
                {activeModal === "DELETE" &&
                  "Bài viết sẽ được đưa vào danh sách đã xóa. Bắt buộc nhập lý do để lưu vết hệ thống (Audit Log)."}
                {activeModal === "RESTORE" &&
                  "Khôi phục bài viết đã xóa trở lại hệ thống và có thể xuất hiện lại trên bảng tin."}
              </p>

              {(activeModal === "DELETE" || activeModal === "HIDE") && (
                <label className="mt-3 block">
                  <span className="text-xs font-bold text-slate-700">
                    Lý do thực hiện{" "}
                    {activeModal === "DELETE" ? (
                      <span className="text-red-600">* (tối thiểu 5 ký tự)</span>
                    ) : (
                      <span className="text-slate-400">(tùy chọn)</span>
                    )}
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value.slice(0, MAX_REASON_LENGTH))
                    }
                    rows={3}
                    placeholder={
                      activeModal === "DELETE"
                        ? "Nhập lý do xóa (ví dụ: nội dung sai sự thật, vi phạm tiêu chuẩn...)"
                        : "Nhập ghi chú lý do ẩn bài..."
                    }
                    className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                  {activeModal === "DELETE" && (
                    <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                      <span>Tối thiểu {MIN_DELETE_REASON_LENGTH} ký tự</span>
                      <span>
                        {reason.length}/{MAX_REASON_LENGTH}
                      </span>
                    </div>
                  )}
                </label>
              )}

              {message && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {message}
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={submitModeration}
                  disabled={!canSubmit}
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    activeModal === "DELETE"
                      ? "bg-red-600 hover:bg-red-500"
                      : activeModal === "HIDE"
                      ? "bg-amber-600 hover:bg-amber-500"
                      : activeModal === "UNHIDE"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {isPending && (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  )}
                  {activeModal === "DELETE"
                    ? "Xác nhận xóa"
                    : activeModal === "HIDE"
                    ? "Xác nhận ẩn"
                    : activeModal === "UNHIDE"
                    ? "Xác nhận hiện"
                    : "Xác nhận khôi phục"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
