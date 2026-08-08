"use client";

import {
  useEffect,
  useState,
} from "react";

type NotificationItem = {
  id: string;
  postId: string;
  type: "REACTION" | "COMMENT";
  reactionType:
    | "LIKE"
    | "LOVE"
    | "WOW"
    | null;
  commentPreview: string | null;
  readAt: string | null;
  createdAt: string;
  actorName: string;
};

type NotificationResponse = {
  ok: boolean;
  unreadCount?: number;
  notifications?: NotificationItem[];
};

function getNotificationText(
  notification: NotificationItem,
): string {
  if (
    notification.type ===
    "COMMENT"
  ) {
    const preview =
      notification.commentPreview
        ?.trim();

    return preview
      ? `💬 ${notification.actorName} đã bình luận: “${preview}”`
      : `💬 ${notification.actorName} đã bình luận bài viết của bạn`;
  }

  if (
    notification.reactionType ===
    "LOVE"
  ) {
    return `❤️ ${notification.actorName} đã LOVE bài viết của bạn`;
  }

  if (
    notification.reactionType ===
    "WOW"
  ) {
    return `😮 ${notification.actorName} đã WOW bài viết của bạn`;
  }

  return `👍 ${notification.actorName} đã LIKE bài viết của bạn`;
}

function formatNotificationTime(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export function SocialNotificationBell() {
  const [isAvailable, setIsAvailable] =
    useState(false);
  const [isOpen, setIsOpen] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(true);
  const [unreadCount, setUnreadCount] =
    useState(0);
  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch(
          "/api/social/notifications",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          return;
        }

        const payload =
          (await response.json()) as
            NotificationResponse;

        if (
          !response.ok ||
          !payload.ok
        ) {
          return;
        }

        if (!isCancelled) {
          setIsAvailable(true);
          setUnreadCount(
            payload.unreadCount ?? 0,
          );
          setNotifications(
            payload.notifications ?? [],
          );
        }
      } catch (error) {
        console.error(
          "Notification bell load failed",
          error,
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function markAllRead() {
    if (unreadCount <= 0) {
      return;
    }

    const readAt =
      new Date().toISOString();

    setUnreadCount(0);
    setNotifications(
      (items) =>
        items.map((item) => ({
          ...item,
          readAt:
            item.readAt ?? readAt,
        })),
    );

    try {
      const response = await fetch(
        "/api/social/notifications",
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(
          "MARK_READ_FAILED",
        );
      }
    } catch (error) {
      console.error(
        "Notification bell mark-read failed",
        error,
      );
    }
  }

  if (
    isLoading ||
    !isAvailable
  ) {
    return null;
  }

  const badgeLabel =
    unreadCount > 99
      ? "99+"
      : String(unreadCount);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Thông báo"
        aria-expanded={isOpen}
        onClick={() => {
          const nextOpen =
            !isOpen;

          setIsOpen(nextOpen);

          if (nextOpen) {
            void markAllRead();
          }
        }}
        className="relative inline-flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-lg text-white transition hover:bg-white/20"
      >
        <span aria-hidden="true">
          🔔
        </span>

        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white shadow">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[calc(100svh-5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[360px]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-semibold">
              Thông báo
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              15 tương tác gần nhất
            </p>
          </div>

          {notifications.length > 0 ? (
            <div className="max-h-[calc(100svh-10rem)] overflow-y-auto sm:max-h-96">
              {notifications.map(
                (notification) => (
                  <a
                    key={
                      notification.id
                    }
                    href={`/?focusPost=${encodeURIComponent(
                      notification.postId,
                    )}#cong-dong`}
                    className="block border-b border-slate-100 px-4 py-3 transition hover:bg-emerald-50/70 last:border-b-0"
                  >
                    <p className="text-sm leading-5 text-slate-800">
                      {getNotificationText(
                        notification,
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatNotificationTime(
                        notification.createdAt,
                      )}
                    </p>
                  </a>
                ),
              )}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Chưa có thông báo.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
