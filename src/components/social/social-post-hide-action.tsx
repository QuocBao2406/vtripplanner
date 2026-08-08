"use client";

import { useState } from "react";

const POST_HIDDEN_EVENT =
  "vtrip:travel-post-hidden";

type HideResponse = {
  ok?: boolean;
  message?: string;
};

export function SocialPostHideAction({
  postId,
}: {
  postId: string;
}) {
  const [isPending, setIsPending] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function hidePost() {
    if (isPending) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/social/hides",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            postId,
          }),
        },
      );
      const payload =
        (await response.json()) as
          HideResponse;

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.message ??
            "Không thể ẩn bài viết.",
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          POST_HIDDEN_EVENT,
          {
            detail: {
              postId,
            },
          },
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể ẩn bài viết.",
      );
      setIsPending(false);
    }
  }

  return (
    <details className="relative">
      <summary
        aria-label="Tùy chọn bài viết"
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        ⋯
      </summary>

      <div className="absolute right-0 top-10 z-30 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        <button
          type="button"
          disabled={isPending}
          onClick={(event) => {
            event.preventDefault();
            void hidePost();
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Đang ẩn..."
            : "Không quan tâm"}
        </button>

        {errorMessage ? (
          <p className="px-3 pb-2 pt-1 text-xs leading-5 text-rose-600">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </details>
  );
}
