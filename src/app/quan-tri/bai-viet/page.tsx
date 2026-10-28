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
  | "HIDDEN"
  | "DELETED";

type ModerationState =
  | "VISIBLE"
  | "HIDDEN"
  | "DELETED"
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
    value === "HIDDEN" ||
    value === "DELETED"
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
  type?: TravelPostType;
  status: TravelPostStatus;
  deletedAt: Date | null;
}): ModerationState {
  if (post.deletedAt) {
    return "DELETED";
  }

  if (post.status === TravelPostStatus.HIDDEN) {
    return "HIDDEN";
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
          "bg-emerald-50 text-emerald-700 border border-emerald-200",
      };
    case "HIDDEN":
      return {
        label: "Đang ẩn",
        className:
          "bg-amber-50 text-amber-700 border border-amber-200",
      };
    case "DELETED":
      return {
        label: "Đã xóa",
        className:
          "bg-red-50 text-red-700 border border-red-200",
      };
    default:
      return {
        label: status.replaceAll(
          "_",
          " ",
        ),
        className:
          "bg-slate-100 text-slate-600 border border-slate-200",
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
                "ADMIN_SOCIAL_POST_HIDE",
                "ADMIN_SOCIAL_POST_UNHIDE",
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
  const hiddenCount =
    posts.filter(
      (post) =>
        getModerationState(post) ===
        "HIDDEN",
    ).length;
  const deletedCount =
    posts.filter(
      (post) =>
        getModerationState(post) ===
        "DELETED",
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
              ADMIN có toàn quyền kiểm duyệt: Ẩn/Hiện bài viết trên bảng tin và
              Xóa các bài viết vi phạm, cũng như khôi phục khi cần.
            </p>
          </div>

          <div className="max-w-xl rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
            <div className="flex items-start gap-2">
              <ShieldAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-blue-600"
              />
              <p>
                <strong>Ẩn bài:</strong> tạm thời ngừng hiển thị bài trên feed mà vẫn giữ nguyên dữ liệu.{" "}
                <strong>Xóa bài:</strong> chuyển bài vào thùng rác đã xóa (Admin có thể khôi phục lại).
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

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Đang ẩn
            </p>
            <p className="mt-2 text-3xl font-black text-amber-900">
              {hiddenCount.toLocaleString(
                "vi-VN",
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
              Đã xóa
            </p>
            <p className="mt-2 text-3xl font-black text-red-900">
              {deletedCount.toLocaleString(
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
                <option value="HIDDEN">
                  Đang ẩn
                </option>
                <option value="DELETED">
                  Đã xóa
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
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
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
                      </div>

                      <div className="shrink-0 sm:self-start">
                        <AdminSocialPostModerationAction
                          postId={post.id}
                          postLabel={
                            post.headline ??
                            post.caption ??
                            authorName
                          }
                          status={post.status}
                          deletedAt={post.deletedAt}
                        />
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
                              {latestModeration.action === "ADMIN_SOCIAL_POST_HIDE"
                                ? "ADMIN đã ẩn bài"
                                : latestModeration.action === "ADMIN_SOCIAL_POST_UNHIDE"
                                ? "ADMIN đã hiển thị lại bài"
                                : latestModeration.action === "ADMIN_SOCIAL_POST_DELETE"
                                ? "ADMIN đã xóa bài"
                                : latestModeration.action === "ADMIN_SOCIAL_POST_RESTORE"
                                ? "ADMIN đã khôi phục bài"
                                : latestModeration.action}
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
              ADMIN có toàn quyền quản lý: <strong>Ẩn bài</strong> (chuyển sang trạng thái HIDDEN) để tạm ngưng xuất hiện trên bảng tin,
              hoặc <strong>Xóa bài</strong> (đưa vào thùng rác đã xóa) và <strong>Khôi phục</strong> bất kỳ bài viết nào khi cần thiết.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
