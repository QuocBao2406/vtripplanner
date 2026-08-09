/* eslint-disable @next/next/no-img-element */

import {
  FileText,
  ImageIcon,
  MessageCircle,
  Search,
  ShieldAlert,
  ThumbsUp,
  UserRound,
  Video,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminSocialPostModerationAction } from "@/components/admin/admin-social-post-moderation-action";
import {
  AppRole,
  TravelPostStatus,
  TravelPostType,
} from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Quản lý bài viết | VTripPlanner",
  description:
    "Theo dõi và moderation bài viết cộng đồng VTripPlanner.",
};

export const dynamic = "force-dynamic";

type AdminPostSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

type PostTypeFilter =
  | "ALL"
  | TravelPostType;

type ModerationStateFilter =
  | "ALL"
  | "VISIBLE"
  | "ADMIN_REMOVED"
  | "USER_DELETED";

type ModerationState =
  | "VISIBLE"
  | "ADMIN_REMOVED"
  | "USER_DELETED"
  | "OTHER";

const TYPE_LABELS: Record<
  TravelPostType,
  string
> = {
  [TravelPostType.USER_TRIP]:
    "USER_TRIP",
  [TravelPostType.SEASONAL_GUIDE]:
    "SEASONAL_GUIDE",
  [TravelPostType.EVERGREEN_GUIDE]:
    "EVERGREEN_GUIDE",
  [TravelPostType.PROMOTED]:
    "PROMOTED",
};

function getSingleSearchParam(
  value: string | string[] | undefined,
): string {
  return typeof value === "string"
    ? value
    : "";
}

function parseTypeFilter(
  value: string,
): PostTypeFilter {
  if (
    value === TravelPostType.USER_TRIP ||
    value ===
      TravelPostType.SEASONAL_GUIDE ||
    value ===
      TravelPostType.EVERGREEN_GUIDE ||
    value === TravelPostType.PROMOTED
  ) {
    return value;
  }

  return "ALL";
}

function parseStateFilter(
  value: string,
): ModerationStateFilter {
  if (
    value === "VISIBLE" ||
    value === "ADMIN_REMOVED" ||
    value === "USER_DELETED"
  ) {
    return value;
  }

  return "ALL";
}

function formatDateTime(
  value: Date | null,
): string {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Asia/Ho_Chi_Minh",
    },
  ).format(value);
}

function getAuthorName(post: {
  author: {
    email: string | null;
    profile: {
      fullName: string | null;
      displayName: string | null;
    } | null;
  } | null;
}): string {
  if (!post.author) {
    return "VTripPlanner";
  }

  return (
    post.author.profile?.displayName?.trim() ||
    post.author.profile?.fullName?.trim() ||
    post.author.email?.split("@")[0] ||
    "Người dùng VTripPlanner"
  );
}

function getModerationState(post: {
  type: TravelPostType;
  status: TravelPostStatus;
  deletedAt: Date | null;
}): ModerationState {
  if (post.deletedAt) {
    return "USER_DELETED";
  }

  if (
    post.type ===
      TravelPostType.USER_TRIP &&
    post.status ===
      TravelPostStatus.HIDDEN
  ) {
    return "ADMIN_REMOVED";
  }

  if (
    post.status ===
    TravelPostStatus.PUBLISHED
  ) {
    return "VISIBLE";
  }

  return "OTHER";
}

function getModerationReason(
  metadata: unknown,
): string | null {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const reason = (
    metadata as Record<
      string,
      unknown
    >
  ).reason;

  return typeof reason === "string"
    ? reason
    : null;
}

function getPublicTravelPostMediaUrl(
  storagePath: string | null,
): string | null {
  if (!storagePath) {
    return null;
  }

  if (storagePath.startsWith("/")) {
    return storagePath;
  }

  if (
    storagePath.startsWith(
      "https://",
    ) ||
    storagePath.startsWith(
      "http://",
    )
  ) {
    return storagePath;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
      /\/+$/,
      "",
    );

  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment),
    )
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/travel-post-media/${encodedPath}`;
}

function getStateBadge(
  state: ModerationState,
  status: TravelPostStatus,
): {
  label: string;
  className: string;
} {
  switch (state) {
    case "VISIBLE":
      return {
        label: "Đang hiển thị",
        className:
          "bg-emerald-50 text-emerald-700",
      };
    case "ADMIN_REMOVED":
      return {
        label: "ADMIN đã xóa",
        className:
          "bg-red-50 text-red-700",
      };
    case "USER_DELETED":
      return {
        label: "User đã xóa",
        className:
          "bg-amber-50 text-amber-700",
      };
    default:
      return {
        label: status.replaceAll(
          "_",
          " ",
        ),
        className:
          "bg-slate-100 text-slate-600",
      };
  }
}

export default async function AdminSocialPostsPage({
  searchParams,
}: {
  searchParams: AdminPostSearchParams;
}) {
  const access = await requireRole([
    AppRole.ADMIN,
  ]);
  const resolvedSearchParams =
    await searchParams;

  const searchQuery =
    getSingleSearchParam(
      resolvedSearchParams.q,
    ).trim();
  const typeFilter =
    parseTypeFilter(
      getSingleSearchParam(
        resolvedSearchParams.type,
      ),
    );
  const stateFilter =
    parseStateFilter(
      getSingleSearchParam(
        resolvedSearchParams.state,
      ),
    );

  const posts =
    await prisma.travelPost.findMany({
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        authorUserId: true,
        type: true,
        status: true,
        headline: true,
        caption: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        author: {
          select: {
            email: true,
            profile: {
              select: {
                fullName: true,
                displayName: true,
              },
            },
          },
        },
        media: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 4,
          select: {
            id: true,
            type: true,
            storagePath: true,
            mimeType: true,
            altText: true,
            sortOrder: true,
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: true,
            saves: true,
          },
        },
      },
    });

  const postIds = posts.map(
    (post) => post.id,
  );

  const moderationLogs =
    postIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            entityType:
              "TravelPost",
            entityId: {
              in: postIds,
            },
            action: {
              in: [
                "ADMIN_SOCIAL_POST_DELETE",
                "ADMIN_SOCIAL_POST_RESTORE",
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            entityId: true,
            action: true,
            metadata: true,
            createdAt: true,
          },
        })
      : [];

  const latestModerationByPost =
    new Map<
      string,
      (typeof moderationLogs)[number]
    >();

  for (const log of moderationLogs) {
    if (!log.entityId) {
      continue;
    }

    if (
      !latestModerationByPost.has(
        log.entityId,
      )
    ) {
      latestModerationByPost.set(
        log.entityId,
        log,
      );
    }
  }

  const normalizedQuery =
    searchQuery.toLocaleLowerCase(
      "vi-VN",
    );

  const filteredPosts =
    posts.filter((post) => {
      const authorName =
        getAuthorName(post);
      const searchableText = [
        post.headline ?? "",
        post.caption ?? "",
        authorName,
        post.author?.email ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("vi-VN");

      const state =
        getModerationState(post);

      const queryMatches =
        !normalizedQuery ||
        searchableText.includes(
          normalizedQuery,
        );

      const typeMatches =
        typeFilter === "ALL" ||
        post.type === typeFilter;

      const stateMatches =
        stateFilter === "ALL" ||
        state === stateFilter;

      return (
        queryMatches &&
        typeMatches &&
        stateMatches
      );
    });

  const visibleCount = posts.filter(
    (post) =>
      getModerationState(post) ===
      "VISIBLE",
  ).length;
  const adminRemovedCount =
    posts.filter(
      (post) =>
        getModerationState(post) ===
        "ADMIN_REMOVED",
    ).length;
  const userDeletedCount =
    posts.filter(
      (post) =>
        getModerationState(post) ===
        "USER_DELETED",
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-black tracking-tight transition hover:text-violet-200"
          >
            VTripPlanner
          </Link>

          <div className="text-right">
            <p className="text-sm font-bold">
              ADMIN · Bài viết
            </p>
            <p className="hidden max-w-64 truncate text-xs text-slate-400 sm:block">
              {access.authUser.email ??
                "Tài khoản quản trị"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
              <Link
                href="/quan-tri"
                className="text-slate-500 transition hover:text-violet-700"
              >
                ← Dashboard
              </Link>
              <Link
                href="/"
                className="text-slate-500 transition hover:text-violet-700"
              >
                Trang chủ
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <FileText
                  aria-hidden="true"
                  className="size-6"
                />
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Social Moderation
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Quản lý bài viết
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              ADMIN có thể xóa bài
              USER_TRIP không hợp lệ và
              khôi phục bài do ADMIN xử
              lý nhầm. Xóa moderation
              không hard-delete media,
              reaction, comment hay save.
            </p>
          </div>

          <div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <div className="flex items-start gap-2">
              <ShieldAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <p>
                User tự xóa và ADMIN xóa
                là hai trạng thái riêng.
                ADMIN không thể khôi phục
                bài mà chính user đã xóa.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Tổng bài
            </p>
            <p className="mt-2 text-3xl font-black">
              {posts.length.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Đang hiển thị
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-900">
              {visibleCount.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
              ADMIN đã xóa
            </p>
            <p className="mt-2 text-3xl font-black text-red-900">
              {adminRemovedCount.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              User đã xóa
            </p>
            <p className="mt-2 text-3xl font-black text-amber-900">
              {userDeletedCount.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            method="get"
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]"
          >
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Tìm kiếm
              </span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <Search
                  aria-hidden="true"
                  className="size-4 shrink-0 text-slate-400"
                />
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Caption, headline, tác giả..."
                  className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Loại bài
              </span>
              <select
                name="type"
                defaultValue={typeFilter}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-300"
              >
                <option value="ALL">
                  Tất cả
                </option>
                {Object.values(
                  TravelPostType,
                ).map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {
                      TYPE_LABELS[
                        type
                      ]
                    }
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Trạng thái
              </span>
              <select
                name="state"
                defaultValue={
                  stateFilter
                }
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-300"
              >
                <option value="ALL">
                  Tất cả
                </option>
                <option value="VISIBLE">
                  Đang hiển thị
                </option>
                <option value="ADMIN_REMOVED">
                  ADMIN đã xóa
                </option>
                <option value="USER_DELETED">
                  User đã xóa
                </option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Lọc
              </button>
              <Link
                href="/quan-tri/bai-viet"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            </div>
          </form>

          <p className="mt-3 text-xs text-slate-500">
            Hiển thị{" "}
            <strong className="text-slate-700">
              {filteredPosts.length.toLocaleString(
                "vi-VN",
              )}
            </strong>{" "}
            /{" "}
            {posts.length.toLocaleString(
              "vi-VN",
            )}{" "}
            bài viết.
          </p>
        </section>

        <section className="mt-5 space-y-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const state =
                getModerationState(
                  post,
                );
              const badge =
                getStateBadge(
                  state,
                  post.status,
                );
              const authorName =
                getAuthorName(post);
              const latestModeration =
                latestModerationByPost.get(
                  post.id,
                );
              const latestReason =
                getModerationReason(
                  latestModeration?.metadata,
                );
              const media = post.media
                .map((item) => ({
                  ...item,
                  url:
                    getPublicTravelPostMediaUrl(
                      item.storagePath,
                    ),
                }))
                .filter(
                  (item) =>
                    Boolean(item.url),
                );

              return (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                            {
                              TYPE_LABELS[
                                post.type
                              ]
                            }
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="mt-3 flex items-start gap-2">
                          <UserRound
                            aria-hidden="true"
                            className="mt-0.5 size-5 shrink-0 text-slate-400"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">
                              {authorName}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {post.author
                                ?.email ??
                                "Bài hệ thống"}{" "}
                              ·{" "}
                              {formatDateTime(
                                post.publishedAt ??
                                  post.createdAt,
                              )}
                            </p>
                          </div>
                        </div>

                        {post.headline ? (
                          <h2 className="mt-4 text-lg font-black leading-6 text-slate-950">
                            {post.headline}
                          </h2>
                        ) : null}

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {post.caption ||
                            "Bài viết không có caption."}
                        </p>
                      </div>

                      <div className="w-full lg:w-64">
                        {post.type ===
                          TravelPostType.USER_TRIP &&
                        !post.deletedAt &&
                        post.status ===
                          TravelPostStatus.PUBLISHED ? (
                          <AdminSocialPostModerationAction
                            postId={
                              post.id
                            }
                            postLabel={
                              post.headline ??
                              post.caption ??
                              authorName
                            }
                            mode="DELETE"
                          />
                        ) : post.type ===
                            TravelPostType.USER_TRIP &&
                          !post.deletedAt &&
                          post.status ===
                            TravelPostStatus.HIDDEN ? (
                          <AdminSocialPostModerationAction
                            postId={
                              post.id
                            }
                            postLabel={
                              post.headline ??
                              post.caption ??
                              authorName
                            }
                            mode="RESTORE"
                          />
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
                            {post.deletedAt
                              ? "User đã tự xóa bài này; ADMIN chỉ có thể xem audit và không được khôi phục."
                              : post.type !==
                                  TravelPostType.USER_TRIP
                                ? "Bài hệ thống chỉ được theo dõi ở bước này, không dùng action xóa USER_TRIP."
                                : "Bài chưa ở trạng thái có thể moderation."}
                          </div>
                        )}
                      </div>
                    </div>

                    {media.length > 0 ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:max-w-3xl">
                        {media.map(
                          (item) => (
                            <div
                              key={
                                item.id
                              }
                              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                            >
                              {item.type ===
                              "VIDEO" ? (
                                <video
                                  controls
                                  preload="metadata"
                                  className="aspect-video w-full bg-black object-contain"
                                >
                                  <source
                                    src={
                                      item.url ??
                                      undefined
                                    }
                                    type={
                                      item.mimeType ??
                                      undefined
                                    }
                                  />
                                </video>
                              ) : (
                                <img
                                  src={
                                    item.url ??
                                    undefined
                                  }
                                  alt={
                                    item.altText ??
                                    post.headline ??
                                    "Ảnh bài viết du lịch"
                                  }
                                  className="aspect-[3/2] w-full object-cover"
                                />
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        <ImageIcon
                          aria-hidden="true"
                          className="size-4"
                        />
                        Không có media upload
                        trong bài này.
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <ThumbsUp
                          aria-hidden="true"
                          className="size-4"
                        />
                        {post._count.reactions.toLocaleString(
                          "vi-VN",
                        )}{" "}
                        reaction
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle
                          aria-hidden="true"
                          className="size-4"
                        />
                        {post._count.comments.toLocaleString(
                          "vi-VN",
                        )}{" "}
                        comment
                      </span>
                      <span>
                        {post._count.saves.toLocaleString(
                          "vi-VN",
                        )}{" "}
                        lượt lưu
                      </span>
                      <span>
                        ID:{" "}
                        <code className="font-mono">
                          {post.id}
                        </code>
                      </span>
                    </div>

                    {latestModeration ? (
                      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
                        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-slate-700">
                          Lịch sử moderation gần
                          nhất
                        </summary>
                        <div className="border-t border-slate-200 px-3 py-3 text-xs leading-5 text-slate-600">
                          <p>
                            <strong>
                              {
                                latestModeration.action
                              }
                            </strong>{" "}
                            ·{" "}
                            {formatDateTime(
                              latestModeration.createdAt,
                            )}
                          </p>
                          <p className="mt-1">
                            Lý do:{" "}
                            {latestReason ??
                              "Không có ghi chú."}
                          </p>
                        </div>
                      </details>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
              <FileText
                aria-hidden="true"
                className="mx-auto size-8 text-slate-300"
              />
              <p className="mt-3 font-bold text-slate-800">
                Không tìm thấy bài viết
                phù hợp.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Thử thay đổi từ khóa,
                loại bài hoặc trạng thái.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
          <div className="flex items-start gap-2">
            <Video
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <p>
              ADMIN Delete dùng
              TravelPostStatus.HIDDEN,
              không hard-delete database.
              User Delete tiếp tục dùng
              deletedAt. Vì vậy ADMIN chỉ
              khôi phục được bài do ADMIN
              moderation.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
