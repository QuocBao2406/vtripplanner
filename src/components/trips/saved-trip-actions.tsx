"use client";

import {
  type FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const MAX_TITLE_LENGTH = 200;

type ManageTripResponse = {
  ok?: boolean;
  trip?: {
    id: string;
    title: string;
  };
  tripId?: string;
  message?: string;
};

type SavedTripActionsProps = {
  tripId: string;
  initialTitle: string;
};

async function readPayload(
  response: Response,
): Promise<ManageTripResponse> {
  try {
    return (
      (await response.json()) as ManageTripResponse
    );
  } catch {
    return {};
  }
}

function handleAccessFailure(
  response: Response,
): boolean {
  if (response.status === 401) {
    const message = encodeURIComponent(
      "Vui lòng đăng nhập để quản lý chuyến đi.",
    );

    window.location.href =
      `/dang-nhap?message=${message}`;

    return true;
  }

  if (response.status === 403) {
    window.location.href =
      "/khong-co-quyen?reason=inactive";

    return true;
  }

  return false;
}

export function SavedTripActions({
  tripId,
  initialTitle,
}: SavedTripActionsProps) {
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);
  const [isEditing, setIsEditing] =
    useState(false);
  const [title, setTitle] =
    useState(initialTitle);
  const [draftTitle, setDraftTitle] =
    useState(initialTitle);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  function beginRename() {
    setDraftTitle(title);
    setIsEditing(true);
    setIsMenuOpen(false);
    setErrorMessage("");
  }

  function cancelRename() {
    setDraftTitle(title);
    setIsEditing(false);
    setErrorMessage("");
  }

  async function handleRename(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextTitle =
      draftTitle.trim();

    if (!nextTitle) {
      setErrorMessage(
        "Tên chuyến đi không được để trống.",
      );
      return;
    }

    if (
      nextTitle.length >
      MAX_TITLE_LENGTH
    ) {
      setErrorMessage(
        `Tên chuyến đi tối đa ${MAX_TITLE_LENGTH} ký tự.`,
      );
      return;
    }

    if (nextTitle === title) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/trips/manage",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            tripId,
            title: nextTitle,
          }),
        },
      );

      if (handleAccessFailure(response)) {
        return;
      }

      const payload =
        await readPayload(response);

      if (
        !response.ok ||
        !payload.trip
      ) {
        setErrorMessage(
          payload.message ??
            "Không thể đổi tên chuyến đi. Vui lòng thử lại.",
        );
        return;
      }

      setTitle(payload.trip.title);
      setDraftTitle(
        payload.trip.title,
      );
      setIsEditing(false);
      router.refresh();
    } catch {
      setErrorMessage(
        "Không thể kết nối để đổi tên chuyến đi. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (isSubmitting) {
      return;
    }

    const confirmed =
      window.confirm(
        `Xóa "${title}"? Chuyến đi sẽ không còn xuất hiện trong danh sách của bạn.`,
      );

    if (!confirmed) {
      setIsMenuOpen(false);
      return;
    }

    setIsSubmitting(true);
    setIsMenuOpen(false);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/trips/manage",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            tripId,
          }),
        },
      );

      if (handleAccessFailure(response)) {
        return;
      }

      const payload =
        await readPayload(response);

      if (!response.ok) {
        setErrorMessage(
          payload.message ??
            "Không thể xóa chuyến đi. Vui lòng thử lại.",
        );
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage(
        "Không thể kết nối để xóa chuyến đi. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleRename}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:w-[320px]"
      >
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Đổi tên chuyến đi
          </span>
          <input
            autoFocus
            value={draftTitle}
            maxLength={MAX_TITLE_LENGTH}
            disabled={isSubmitting}
            onChange={(event) => {
              setDraftTitle(
                event.target.value,
              );
              setErrorMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
          />
        </label>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            {draftTitle.length}/
            {MAX_TITLE_LENGTH}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelRename}
              disabled={isSubmitting}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !draftTitle.trim()
              }
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
            >
              {isSubmitting
                ? "Đang lưu"
                : "Lưu tên"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-2 text-xs font-medium text-red-600"
          >
            {errorMessage}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!isSubmitting) {
            setIsMenuOpen(
              (current) => !current,
            );
            setErrorMessage("");
          }
        }}
        disabled={isSubmitting}
        aria-label="Quản lý chuyến đi"
        aria-expanded={isMenuOpen}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
      >
        •••
      </button>

      {isMenuOpen ? (
        <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
          <button
            type="button"
            onClick={beginRename}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Đổi tên
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Xóa chuyến đi
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-lg"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
