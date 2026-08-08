"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

const MAX_COMMENT_LENGTH = 2000;

type SocialComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isOwner: boolean;
};

type CommentsResponse = {
  ok?: boolean;
  comments?: SocialComment[];
  comment?: SocialComment;
  commentId?: string;
  commentCount?: number;
  hasMore?: boolean;
  message?: string;
};

type SocialPostCommentsProps = {
  postId: string;
  initialCommentCount: number;
  onCommentCountChange: (count: number) => void;
};

function getInitial(name: string): string {
  const normalized = name.trim();

  return normalized
    ? normalized.charAt(0).toLocaleUpperCase("vi-VN")
    : "V";
}

function formatCommentTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function wasEdited(comment: SocialComment): boolean {
  const createdAt = new Date(comment.createdAt).getTime();
  const updatedAt = new Date(comment.updatedAt).getTime();

  if (
    Number.isNaN(createdAt) ||
    Number.isNaN(updatedAt)
  ) {
    return false;
  }

  return updatedAt - createdAt > 1000;
}

function CommentAvatar({
  comment,
}: {
  comment: SocialComment;
}) {
  if (comment.authorAvatarUrl) {
    return (
      <div
        role="img"
        aria-label={`Ảnh đại diện của ${comment.authorName}`}
        className="size-9 shrink-0 rounded-full bg-cover bg-center"
        style={{
          backgroundImage:
            `url("${comment.authorAvatarUrl}")`,
        }}
      />
    );
  }

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-semibold text-white">
      {getInitial(comment.authorName)}
    </div>
  );
}

async function readPayload(
  response: Response,
): Promise<CommentsResponse> {
  try {
    return (await response.json()) as CommentsResponse;
  } catch {
    return {};
  }
}

function redirectToLogin() {
  const message = encodeURIComponent(
    "Vui lòng đăng nhập để bình luận.",
  );

  window.location.href = `/dang-nhap?message=${message}`;
}

export function SocialPostComments({
  postId,
  initialCommentCount,
  onCommentCountChange,
}: SocialPostCommentsProps) {
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentCount, setCommentCount] =
    useState(initialCommentCount);
  const [hasMore, setHasMore] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingCommentId, setEditingCommentId] =
    useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [openMenuCommentId, setOpenMenuCommentId] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyCommentId, setBusyCommentId] =
    useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  function syncCommentCount(count: number) {
    setCommentCount(count);
    onCommentCountChange(count);
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadComments() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/social/comments?postId=${encodeURIComponent(postId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = await readPayload(response);

        if (!response.ok || !payload.comments) {
          if (!isCancelled) {
            setErrorMessage(
              payload.message ??
                "Không thể tải bình luận. Vui lòng thử lại.",
            );
          }

          return;
        }

        if (!isCancelled) {
          setComments(payload.comments);
          setHasMore(Boolean(payload.hasMore));

          if (
            typeof payload.commentCount === "number"
          ) {
            setCommentCount(payload.commentCount);
            onCommentCountChange(
              payload.commentCount,
            );
          }
        }
      } catch {
        if (!isCancelled) {
          setErrorMessage(
            "Không thể kết nối để tải bình luận. Vui lòng thử lại.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadComments();

    return () => {
      isCancelled = true;
    };
  }, [postId, onCommentCountChange]);

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const content = newContent.trim();

    if (!content) {
      setErrorMessage("Hãy nhập nội dung bình luận.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/social/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          content,
        }),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const payload = await readPayload(response);

      if (
        !response.ok ||
        !payload.comment ||
        typeof payload.commentCount !== "number"
      ) {
        setErrorMessage(
          payload.message ??
            "Không thể đăng bình luận. Vui lòng thử lại.",
        );
        return;
      }

      setComments((current) => [
        ...current,
        payload.comment as SocialComment,
      ]);
      setNewContent("");
      syncCommentCount(payload.commentCount);
    } catch {
      setErrorMessage(
        "Không thể kết nối để đăng bình luận. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function beginEdit(comment: SocialComment) {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setOpenMenuCommentId(null);
    setErrorMessage("");
  }

  function cancelEdit() {
    setEditingCommentId(null);
    setEditingContent("");
    setErrorMessage("");
  }

  async function saveEdit(commentId: string) {
    const content = editingContent.trim();

    if (!content) {
      setErrorMessage("Bình luận không được để trống.");
      return;
    }

    setBusyCommentId(commentId);
    setErrorMessage("");

    try {
      const response = await fetch("/api/social/comments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          commentId,
          content,
        }),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const payload = await readPayload(response);

      if (
        !response.ok ||
        !payload.comment ||
        typeof payload.commentCount !== "number"
      ) {
        setErrorMessage(
          payload.message ??
            "Không thể sửa bình luận. Vui lòng thử lại.",
        );
        return;
      }

      const updatedComment = payload.comment;

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId
            ? updatedComment
            : comment,
        ),
      );

      syncCommentCount(payload.commentCount);
      setEditingCommentId(null);
      setEditingContent("");
    } catch {
      setErrorMessage(
        "Không thể kết nối để sửa bình luận. Vui lòng thử lại.",
      );
    } finally {
      setBusyCommentId(null);
    }
  }

  async function deleteComment(commentId: string) {
    const confirmed = window.confirm(
      "Xóa bình luận này? Nội dung sẽ không còn hiển thị trên bài viết.",
    );

    if (!confirmed) {
      setOpenMenuCommentId(null);
      return;
    }

    setBusyCommentId(commentId);
    setOpenMenuCommentId(null);
    setErrorMessage("");

    try {
      const response = await fetch("/api/social/comments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          commentId,
        }),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const payload = await readPayload(response);

      if (
        !response.ok ||
        typeof payload.commentCount !== "number"
      ) {
        setErrorMessage(
          payload.message ??
            "Không thể xóa bình luận. Vui lòng thử lại.",
        );
        return;
      }

      setComments((current) =>
        current.filter(
          (comment) => comment.id !== commentId,
        ),
      );

      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingContent("");
      }

      syncCommentCount(payload.commentCount);
    } catch {
      setErrorMessage(
        "Không thể kết nối để xóa bình luận. Vui lòng thử lại.",
      );
    } finally {
      setBusyCommentId(null);
    }
  }

  return (
    <div className="border-t border-slate-100 pb-4 pt-4">
      <form
        onSubmit={handleCreate}
        className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">
            Viết bình luận
          </span>
          <textarea
            rows={2}
            maxLength={MAX_COMMENT_LENGTH}
            value={newContent}
            onChange={(event) => {
              setNewContent(event.target.value);
              setErrorMessage("");
            }}
            placeholder="Viết bình luận..."
            disabled={isSubmitting}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={
            isSubmitting || !newContent.trim()
          }
          className="min-h-11 w-full shrink-0 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          {isSubmitting ? "Đang gửi" : "Gửi"}
        </button>
      </form>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
        <span>
          {commentCount > 0
            ? `${commentCount} bình luận`
            : "Chưa có bình luận"}
        </span>
        <span>
          {newContent.length}/{MAX_COMMENT_LENGTH}
        </span>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="py-5 text-center text-sm text-slate-500">
          Đang tải bình luận...
        </p>
      ) : comments.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">
          Hãy là người đầu tiên bình luận về chuyến đi này.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {hasMore ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
              Đang hiển thị các bình luận gần nhất.
            </p>
          ) : null}

          {comments.map((comment) => {
            const isEditing =
              editingCommentId === comment.id;
            const isBusy =
              busyCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className="flex items-start gap-2.5"
              >
                <CommentAvatar comment={comment} />

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <textarea
                        rows={3}
                        maxLength={MAX_COMMENT_LENGTH}
                        value={editingContent}
                        onChange={(event) => {
                          setEditingContent(
                            event.target.value,
                          );
                          setErrorMessage("");
                        }}
                        disabled={isBusy}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                      />

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-400">
                          {editingContent.length}/
                          {MAX_COMMENT_LENGTH}
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isBusy}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              saveEdit(comment.id)
                            }
                            disabled={
                              isBusy ||
                              !editingContent.trim()
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                          >
                            {isBusy
                              ? "Đang lưu"
                              : "Lưu"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1 rounded-2xl bg-slate-100 px-3.5 py-2.5">
                          <p className="text-xs font-semibold text-slate-900">
                            {comment.authorName}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                            {comment.content}
                          </p>
                        </div>

                        {comment.isOwner ? (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuCommentId(
                                  (current) =>
                                    current === comment.id
                                      ? null
                                      : comment.id,
                                )
                              }
                              disabled={isBusy}
                              aria-label="Tùy chọn bình luận"
                              className="flex size-10 items-center justify-center rounded-full text-sm font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                            >
                              •••
                            </button>

                            {openMenuCommentId ===
                            comment.id ? (
                              <div className="absolute right-0 top-8 z-20 w-28 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                                <button
                                  type="button"
                                  onClick={() =>
                                    beginEdit(comment)
                                  }
                                  className="block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteComment(
                                      comment.id,
                                    )
                                  }
                                  className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  Xóa
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 px-2 text-[11px] text-slate-400">
                        <span>
                          {formatCommentTime(
                            comment.createdAt,
                          )}
                        </span>
                        {wasEdited(comment) ? (
                          <>
                            <span aria-hidden="true">
                              ·
                            </span>
                            <span>Đã chỉnh sửa</span>
                          </>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
