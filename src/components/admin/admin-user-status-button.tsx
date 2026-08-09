"use client";

import {
  LoaderCircle,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
} from "react";

type AdminUserStatusButtonProps = {
  userId: string;
  userLabel: string;
  isActive: boolean;
  disabledReason: string | null;
};

type StatusResponse = {
  message?: string;
};

export function AdminUserStatusButton({
  userId,
  userLabel,
  isActive,
  disabledReason,
}: AdminUserStatusButtonProps) {
  const router = useRouter();
  const [message, setMessage] =
    useState<string | null>(null);
  const [isPending, startTransition] =
    useTransition();

  async function updateStatus() {
    if (disabledReason) {
      setMessage(disabledReason);
      return;
    }

    const nextIsActive = !isActive;

    if (
      !nextIsActive &&
      !window.confirm(
        `Vô hiệu hóa tài khoản "${userLabel}"? Người dùng sẽ bị chặn ở lớp ứng dụng cho tới khi ADMIN kích hoạt lại.`,
      )
    ) {
      return;
    }

    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/users/status",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            isActive: nextIsActive,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as StatusResponse;

      if (!response.ok) {
        setMessage(
          payload.message ??
            "Không thể cập nhật trạng thái tài khoản.",
        );
        return;
      }

      setMessage(
        payload.message ??
          "Đã cập nhật trạng thái tài khoản.",
      );

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage(
        "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={updateStatus}
        disabled={
          isPending ||
          Boolean(disabledReason)
        }
        title={disabledReason ?? undefined}
        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isActive
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin"
          />
        ) : isActive ? (
          <UserRoundX
            aria-hidden="true"
            className="size-4"
          />
        ) : (
          <UserRoundCheck
            aria-hidden="true"
            className="size-4"
          />
        )}

        {isActive
          ? "Vô hiệu hóa"
          : "Kích hoạt lại"}
      </button>

      {disabledReason ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {disabledReason}
        </p>
      ) : message ? (
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
