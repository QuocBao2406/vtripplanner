"use client";

import { useState } from "react";

type ReactionType = "LIKE" | "LOVE" | "WOW";

type SocialPostActionsProps = {
  postId: string;
  initialReactionCount: number;
  initialViewerReaction: ReactionType | null;
  commentCount: number;
};

type ReactionResponse = {
  ok?: boolean;
  reactionType?: ReactionType | null;
  reactionCount?: number;
  message?: string;
};

const REACTION_META: Record<
  ReactionType,
  {
    icon: string;
    label: string;
    activeClassName: string;
  }
> = {
  LIKE: {
    icon: "👍",
    label: "Thích",
    activeClassName: "text-blue-700",
  },
  LOVE: {
    icon: "❤️",
    label: "Yêu thích",
    activeClassName: "text-rose-700",
  },
  WOW: {
    icon: "😮",
    label: "Wow",
    activeClassName: "text-amber-700",
  },
};

const REACTION_OPTIONS = Object.keys(
  REACTION_META,
) as ReactionType[];

export function SocialPostActions({
  postId,
  initialReactionCount,
  initialViewerReaction,
  commentCount,
}: SocialPostActionsProps) {
  const [reactionType, setReactionType] =
    useState<ReactionType | null>(initialViewerReaction);
  const [reactionCount, setReactionCount] =
    useState(initialReactionCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function readPayload(
    response: Response,
  ): Promise<ReactionResponse> {
    try {
      return (await response.json()) as ReactionResponse;
    } catch {
      return {};
    }
  }

  function handleAuthenticationFailure(response: Response): boolean {
    if (response.status === 401) {
      const message = encodeURIComponent(
        "Vui lòng đăng nhập để thả cảm xúc.",
      );

      window.location.href = `/dang-nhap?message=${message}`;
      return true;
    }

    if (response.status === 403) {
      window.location.href = "/khong-co-quyen?reason=inactive";
      return true;
    }

    return false;
  }

  async function saveReaction(type: ReactionType) {
    if (isSubmitting) {
      return;
    }

    if (reactionType === type) {
      setIsMenuOpen(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/social/reactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          type,
        }),
      });

      if (handleAuthenticationFailure(response)) {
        return;
      }

      const payload = await readPayload(response);

      if (
        !response.ok ||
        typeof payload.reactionCount !== "number" ||
        !payload.reactionType
      ) {
        setErrorMessage(
          payload.message ??
            "Không thể lưu reaction. Vui lòng thử lại.",
        );
        return;
      }

      setReactionType(payload.reactionType);
      setReactionCount(payload.reactionCount);
      setIsMenuOpen(false);
    } catch {
      setErrorMessage(
        "Không thể kết nối để lưu reaction. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeReaction() {
    if (isSubmitting || !reactionType) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/social/reactions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
        }),
      });

      if (handleAuthenticationFailure(response)) {
        return;
      }

      const payload = await readPayload(response);

      if (
        !response.ok ||
        typeof payload.reactionCount !== "number"
      ) {
        setErrorMessage(
          payload.message ??
            "Không thể bỏ reaction. Vui lòng thử lại.",
        );
        return;
      }

      setReactionType(null);
      setReactionCount(payload.reactionCount);
      setIsMenuOpen(false);
    } catch {
      setErrorMessage(
        "Không thể kết nối để bỏ reaction. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMainReaction() {
    if (reactionType) {
      await removeReaction();
      return;
    }

    await saveReaction("LIKE");
  }

  const activeReaction = reactionType
    ? REACTION_META[reactionType]
    : null;

  return (
    <div className="px-4 pt-4 sm:px-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-500">
        <span>
          {reactionCount > 0
            ? `💚 ${reactionCount}`
            : "Chưa có reaction"}
        </span>

        <span>
          {commentCount > 0
            ? `${commentCount} bình luận`
            : "Chưa có bình luận"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 py-2">
        <div className="relative flex rounded-xl transition hover:bg-slate-50">
          <button
            type="button"
            onClick={handleMainReaction}
            disabled={isSubmitting}
            title={
              reactionType
                ? "Bấm để bỏ reaction"
                : "Bấm để Thích"
            }
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-l-xl px-2 py-2.5 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60 ${
              activeReaction
                ? activeReaction.activeClassName
                : "text-slate-600"
            }`}
          >
            <span aria-hidden="true">
              {activeReaction?.icon ?? "🤍"}
            </span>
            <span className="truncate">
              {activeReaction?.label ?? "Thích"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) {
                setIsMenuOpen((current) => !current);
                setErrorMessage("");
              }
            }}
            disabled={isSubmitting}
            aria-label="Chọn reaction"
            aria-expanded={isMenuOpen}
            className="rounded-r-xl px-2 py-2.5 text-xs text-slate-500 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
          >
            ▾
          </button>

          {isMenuOpen ? (
            <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {REACTION_OPTIONS.map((type) => {
                const option = REACTION_META[type];
                const isSelected = reactionType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => saveReaction(type)}
                    disabled={isSubmitting}
                    title={option.label}
                    aria-label={option.label}
                    className={`flex size-11 items-center justify-center rounded-xl text-xl transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 ${
                      isSelected
                        ? "bg-slate-100 ring-2 ring-emerald-200"
                        : ""
                    }`}
                  >
                    {option.icon}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          disabled
          title="Comment sẽ được kết nối ở bước tiếp theo"
          className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600"
        >
          💬 Bình luận
        </button>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
