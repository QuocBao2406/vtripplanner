"use client";

import {
  LoaderCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
} from "react";

type ModerationMode =
  | "DELETE"
  | "RESTORE";

type ModerationResponse = {
  message?: string;
};

type AdminSocialPostModerationActionProps = {
  postId: string;
  postLabel: string;
  mode: ModerationMode;
};

const MAX_REASON_LENGTH = 500;
const MIN_DELETE_REASON_LENGTH = 5;

export function AdminSocialPostModerationAction({
  postId,
  postLabel,
  mode,
}: AdminSocialPostModerationActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] =
    useState(false);
  const [reason, setReason] =
    useState("");
  const [message, setMessage] =
    useState<string | null>(null);
  const [isPending, startTransition] =
    useTransition();

  const isDelete =
    mode === "DELETE";
  const normalizedReason =
    reason.trim();
  const canSubmit =
    !isPending &&
    (!isDelete ||
      normalizedReason.length >=
        MIN_DELETE_REASON_LENGTH);

  async function submitModeration() {
    if (!canSubmit) {
      return;
    }

    if (
      !isDelete &&
      !window.confirm(
        `Khôi phục bài "${postLabel}"? Bài sẽ có thể xuất hiện lại trong các luồng PUBLISHED.`,
      )
    ) {
      return;
    }

    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/social-posts/moderate",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            postId,
            action: mode,
            reason:
              normalizedReason ||
              undefined,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as ModerationResponse;

      if (!response.ok) {
        setMessage(
          payload.message ??
            "Không thể moderation bài viết.",
        );
        return;
      }

      setMessage(
        payload.message ??
          "Đã cập nhật bài viết.",
      );
      setIsOpen(false);
      setReason("");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage(
        "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      );
    }
  }

  if (!isDelete) {
    return (
      <div>
        <button
          type="button"
          onClick={submitModeration}
          disabled={isPending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : (
            <RotateCcw
              aria-hidden="true"
              className="size-4"
            />
          )}
          Khôi phục bài
        </button>

        {message ? (
          <p className="mt-2 text-xs leading-5 text-slate-600">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setMessage(null);
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
        >
          <Trash2
            aria-hidden="true"
            className="size-4"
          />
          Xóa bài viết
        </button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-black text-red-900">
            Xóa bài khỏi hệ thống hiển
            thị
          </p>
          <p className="mt-1 text-xs leading-5 text-red-800">
            Bắt buộc ghi lý do. Dữ liệu
            bài viết vẫn được giữ để audit
            và có thể khôi phục nếu ADMIN
            xử lý nhầm.
          </p>

          <label className="mt-3 block">
            <span className="text-xs font-bold text-red-900">
              Lý do moderation
            </span>
            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value.slice(
                    0,
                    MAX_REASON_LENGTH,
                  ),
                )
              }
              rows={3}
              placeholder="Ví dụ: Nội dung spam, hình ảnh không phù hợp..."
              className="mt-1.5 w-full resize-y rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400"
            />
          </label>

          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-red-700">
            <span>
              Tối thiểu{" "}
              {
                MIN_DELETE_REASON_LENGTH
              }{" "}
              ký tự
            </span>
            <span>
              {reason.length}/
              {MAX_REASON_LENGTH}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setReason("");
                setMessage(null);
              }}
              disabled={isPending}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitModeration}
              disabled={!canSubmit}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <Trash2
                  aria-hidden="true"
                  className="size-4"
                />
              )}
              Xác nhận xóa
            </button>
          </div>
        </div>
      )}

      {message ? (
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
