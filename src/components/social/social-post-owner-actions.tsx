"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const MAX_CAPTION_LENGTH = 2000;

type ManagePostResponse = {
  ok?: boolean;
  post?: {
    id: string;
    caption: string;
  };
  postId?: string;
  message?: string;
};

type SocialPostOwnerActionsProps = {
  postId: string;
  initialCaption: string;
};

async function readPayload(
  response: Response,
): Promise<ManagePostResponse> {
  try {
    return (
      (await response.json()) as ManagePostResponse
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
      "Vui lòng đăng nhập để quản lý bài viết.",
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

export function SocialPostOwnerActions({
  postId,
  initialCaption,
}: SocialPostOwnerActionsProps) {
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);
  const [isEditing, setIsEditing] =
    useState(false);
  const [caption, setCaption] =
    useState(initialCaption);
  const [draftCaption, setDraftCaption] =
    useState(initialCaption);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !isSubmitting
      ) {
        setDraftCaption(caption);
        setErrorMessage("");
        setIsEditing(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    caption,
    isEditing,
    isSubmitting,
  ]);

  function beginEdit() {
    setDraftCaption(caption);
    setErrorMessage("");
    setIsMenuOpen(false);
    setIsEditing(true);
  }

  function cancelEdit() {
    if (isSubmitting) {
      return;
    }

    setDraftCaption(caption);
    setErrorMessage("");
    setIsEditing(false);
  }

  async function handleEdit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextCaption =
      draftCaption.trim();

    if (!nextCaption) {
      setErrorMessage(
        "Nội dung bài viết không được để trống.",
      );
      return;
    }

    if (
      nextCaption.length >
      MAX_CAPTION_LENGTH
    ) {
      setErrorMessage(
        `Nội dung bài viết tối đa ${MAX_CAPTION_LENGTH} ký tự.`,
      );
      return;
    }

    if (nextCaption === caption) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/social/posts/manage",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            postId,
            caption: nextCaption,
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
        !payload.post
      ) {
        setErrorMessage(
          payload.message ??
            "Không thể chỉnh sửa bài viết. Vui lòng thử lại.",
        );
        return;
      }

      setCaption(payload.post.caption);
      setDraftCaption(
        payload.post.caption,
      );
      setIsEditing(false);
      router.refresh();
    } catch {
      setErrorMessage(
        "Không thể kết nối để chỉnh sửa bài viết. Vui lòng thử lại.",
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
        "Xóa bài viết này? Bài viết sẽ không còn xuất hiện trên feed.",
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
        "/api/social/posts/manage",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            postId,
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
            "Không thể xóa bài viết. Vui lòng thử lại.",
        );
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage(
        "Không thể kết nối để xóa bài viết. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="relative shrink-0">
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
          aria-label="Quản lý bài viết"
          aria-expanded={isMenuOpen}
          className="rounded-xl px-3 py-2 text-sm font-bold tracking-widest text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
        >
          •••
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
            <button
              type="button"
              onClick={beginEdit}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Chỉnh sửa bài viết
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Xóa bài viết
            </button>
          </div>
        ) : null}

        {errorMessage && !isEditing ? (
          <p
            role="alert"
            className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700 shadow-lg"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>

      {isEditing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Chỉnh sửa bài viết"
        >
          <form
            onSubmit={handleEdit}
            className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Chỉnh sửa bài viết
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Chỉ chỉnh sửa nội dung. Muốn đổi ảnh, video hoặc chuyến đi đã gắn, hãy xóa bài và đăng bài mới.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSubmitting}
                aria-label="Đóng"
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <textarea
              autoFocus
              value={draftCaption}
              maxLength={MAX_CAPTION_LENGTH}
              disabled={isSubmitting}
              onChange={(event) => {
                setDraftCaption(
                  event.target.value,
                );
                setErrorMessage("");
              }}
              rows={7}
              className="mt-5 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            />

            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                {draftCaption.length}/
                {MAX_CAPTION_LENGTH}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !draftCaption.trim()
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  {isSubmitting
                    ? "Đang lưu..."
                    : "Lưu thay đổi"}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700"
              >
                {errorMessage}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </>
  );
}
