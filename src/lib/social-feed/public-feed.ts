import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  getReactionInterestSignals,
  type TripReactionInterestSignals,
} from "@/lib/trip-planner/reaction-interest-signals";

const PLACE_IMAGE_BUCKET = "place-images";
const TRAVEL_POST_MEDIA_BUCKET = "travel-post-media";
const MAX_FEED_POSTS = 20;
export const SOCIAL_FEED_BATCH_SIZE = 10;
const MAX_FEED_CANDIDATES = 60;
const MAX_FEED_MEDIA = 10;
const SEASONAL_GUIDE_BOOST = 12;
const MAX_PERSONALIZATION_BOOST = 10;
const MAX_PERSONALIZED_STREAK = 3;
const FEED_CURSOR_VERSION = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ViewerReactionType =
  | "LIKE"
  | "LOVE"
  | "WOW";

export type PublicSocialFeedMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  mimeType: string | null;
  altText: string;
  sortOrder: number;
};

export type PublicSocialFeedTripSummary = {
  id: string;
  title: string;
  destinationName: string | null;
  dayCount: number;
  placeCount: number;
};

export type PublicSocialFeedPost = {
  id: string;
  type:
    | "USER_TRIP"
    | "SEASONAL_GUIDE"
    | "EVERGREEN_GUIDE"
    | "PROMOTED";
  headline: string | null;
  caption: string | null;
  seasonMonths: number[];
  publishedAt: Date;
  sourceName: string;
  sourceAvatarUrl: string | null;
  isSystemPost: boolean;
  viewerCanManage: boolean;
  coverImageUrl: string | null;
  coverImageAlt: string;
  mediaType: "IMAGE" | "VIDEO" | null;
  mediaMimeType: string | null;
  media: PublicSocialFeedMedia[];
  sourceTrip: PublicSocialFeedTripSummary | null;
  viewerReaction: ViewerReactionType | null;
  viewerSaved: boolean;
  places: Array<{
    id: string;
    name: string;
    provinceName: string;
    isPrimary: boolean;
  }>;
  reactionCount: number;
  commentCount: number;
};

export type PublicSocialFeed = {
  currentMonth: number;
  posts: PublicSocialFeedPost[];
};

export type PublicSocialFeedPage =
  PublicSocialFeed & {
    hasMore: boolean;
    nextCursor: string | null;
    sessionKey: string;
  };

type FeedRankingCandidate = {
  id: string;
  type: PublicSocialFeedPost["type"];
  seasonMonths: number[];
  publishedAt: Date | null;
  createdAt: Date;
  places: Array<{
    place: {
      id: string;
    };
  }>;
};

type RankedFeedCandidate<
  T extends FeedRankingCandidate,
> = {
  post: T;
  baseScore: number;
  personalizationBoost: number;
  totalScore: number;
  publishedAtMs: number;
};

type FeedWindowBoundary = {
  createdAt: Date;
  id: string;
};

type FeedCursorPayload = {
  version: 1;
  snapshotAt: string;
  boundaryCreatedAt: string | null;
  boundaryId: string | null;
  remainingIds: string[];
  hasMoreAfterWindow: boolean;
};

type GetPublicSocialFeedPageOptions = {
  cursor?: string | null;
  limit?: number;
};

export class InvalidSocialFeedCursorError extends Error {
  constructor() {
    super("INVALID_SOCIAL_FEED_CURSOR");
    this.name =
      "InvalidSocialFeedCursorError";
  }
}

const FEED_POST_SELECT = {
  id: true as const,
  type: true as const,
  headline: true as const,
  caption: true as const,
  seasonMonths: true as const,
  publishedAt: true as const,
  createdAt: true as const,
  author: {
    select: {
      id: true as const,
      profile: {
        select: {
          displayName: true as const,
          fullName: true as const,
          avatarUrl: true as const,
        },
      },
    },
  },
  media: {
    orderBy: {
      sortOrder: "asc" as const,
    },
    take: MAX_FEED_MEDIA,
    select: {
      id: true as const,
      type: true as const,
      storagePath: true as const,
      mimeType: true as const,
      altText: true as const,
      sortOrder: true as const,
    },
  },
  sourceTrip: {
    select: {
      id: true as const,
      title: true as const,
      destinationProvince: {
        select: {
          name: true as const,
        },
      },
      days: {
        orderBy: {
          dayNumber: "asc" as const,
        },
        select: {
          activities: {
            select: {
              placeId: true as const,
            },
          },
        },
      },
    },
  },
  places: {
    orderBy: [
      {
        isPrimary: "desc" as const,
      },
      {
        sortOrder: "asc" as const,
      },
    ],
    select: {
      isPrimary: true as const,
      place: {
        select: {
          id: true as const,
          name: true as const,
          province: {
            select: {
              name: true as const,
            },
          },
          images: {
            orderBy: [
              {
                isCover: "desc" as const,
              },
              {
                sortOrder: "asc" as const,
              },
            ],
            take: 1,
            select: {
              storagePath: true as const,
              altText: true as const,
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      reactions: true as const,
      comments: {
        where: {
          status: "PUBLISHED" as const,
          deletedAt: null,
        },
      },
    },
  },
};

function getRecencyBoost(
  publishedAt: Date,
): number {
  const ageMilliseconds = Math.max(
    0,
    Date.now() - publishedAt.getTime(),
  );
  const ageDays =
    ageMilliseconds /
    (1000 * 60 * 60 * 24);

  if (ageDays <= 7) {
    return 6;
  }

  if (ageDays <= 30) {
    return 4;
  }

  if (ageDays <= 90) {
    return 2;
  }

  return 0;
}

function getSeasonalBoost(
  post: FeedRankingCandidate,
  currentMonth: number,
): number {
  if (
    post.type === "SEASONAL_GUIDE" &&
    post.seasonMonths.includes(
      currentMonth,
    )
  ) {
    return SEASONAL_GUIDE_BOOST;
  }

  return 0;
}

function getPersonalizationBoost(
  post: FeedRankingCandidate,
  signals:
    | TripReactionInterestSignals
    | null,
): number {
  if (!signals) {
    return 0;
  }

  const reactionScoreByPlaceId =
    new Map(
      signals.topPlaces.map(
        (signal) => [
          signal.placeId,
          signal.score,
        ],
      ),
    );

  const savedCountByPlaceId =
    new Map(
      signals.topSavedPlaces.map(
        (signal) => [
          signal.placeId,
          signal.saveCount,
        ],
      ),
    );

  const uniquePlaceIds = new Set(
    post.places.map(
      (placeLink) =>
        placeLink.place.id,
    ),
  );

  let reactionBoost = 0;
  let savedBoost = 0;

  for (const placeId of uniquePlaceIds) {
    const reactionScore =
      reactionScoreByPlaceId.get(
        placeId,
      ) ?? 0;
    const saveCount =
      savedCountByPlaceId.get(
        placeId,
      ) ?? 0;

    if (reactionScore > 0) {
      reactionBoost += Math.min(
        6,
        reactionScore * 2,
      );
    }

    if (saveCount > 0) {
      savedBoost += Math.min(
        6,
        saveCount * 3,
      );
    }
  }

  return Math.min(
    MAX_PERSONALIZATION_BOOST,
    reactionBoost + savedBoost,
  );
}

function rankFeedCandidates<
  T extends FeedRankingCandidate,
>(
  posts: T[],
  currentMonth: number,
  signals:
    | TripReactionInterestSignals
    | null,
  limit: number,
): T[] {
  const ranked:
    RankedFeedCandidate<T>[] =
    posts
      .map((post) => {
        const publishedAt =
          post.publishedAt ??
          post.createdAt;
        const seasonalBoost =
          getSeasonalBoost(
            post,
            currentMonth,
          );
        const recencyBoost =
          getRecencyBoost(
            publishedAt,
          );
        const baseScore =
          seasonalBoost +
          recencyBoost;
        const personalizationBoost =
          getPersonalizationBoost(
            post,
            signals,
          );

        return {
          post,
          baseScore,
          personalizationBoost,
          totalScore:
            baseScore +
            personalizationBoost,
          publishedAtMs:
            publishedAt.getTime(),
        };
      })
      .sort(
        (left, right) =>
          right.totalScore -
            left.totalScore ||
          right.baseScore -
            left.baseScore ||
          right.personalizationBoost -
            left.personalizationBoost ||
          right.publishedAtMs -
            left.publishedAtMs ||
          left.post.id.localeCompare(
            right.post.id,
          ),
      );

  const hasBehaviorSignals =
    Boolean(
      signals &&
        (
          signals.reactionCount > 0 ||
          signals.saveCount > 0
        ),
    );

  if (!hasBehaviorSignals) {
    return ranked
      .slice(0, limit)
      .map((item) => item.post);
  }

  const remaining = [...ranked];
  const selected: T[] = [];
  let personalizedStreak = 0;

  while (
    remaining.length > 0 &&
    selected.length < limit
  ) {
    let selectedIndex = 0;

    if (
      personalizedStreak >=
      MAX_PERSONALIZED_STREAK
    ) {
      const explorationIndex =
        remaining.findIndex(
          (item) =>
            item.personalizationBoost ===
            0,
        );

      if (explorationIndex >= 0) {
        selectedIndex =
          explorationIndex;
      }
    }

    const nextItem =
      remaining.splice(
        selectedIndex,
        1,
      )[0];

    if (!nextItem) {
      break;
    }

    selected.push(nextItem.post);

    if (
      nextItem.personalizationBoost >
      0
    ) {
      personalizedStreak += 1;
    } else {
      personalizedStreak = 0;
    }
  }

  return selected;
}

function getPublicStorageUrl(
  bucketName: string,
  storagePath: string | null,
): string | null {
  if (!storagePath) {
    return null;
  }

  if (storagePath.startsWith("/")) {
    return storagePath;
  }

  if (
    storagePath.startsWith("https://") ||
    storagePath.startsWith("http://")
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

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
}

function getPublicPlaceImageUrl(
  storagePath: string | null,
): string | null {
  return getPublicStorageUrl(
    PLACE_IMAGE_BUCKET,
    storagePath,
  );
}

function getPublicTravelPostMediaUrl(
  storagePath: string | null,
): string | null {
  return getPublicStorageUrl(
    TRAVEL_POST_MEDIA_BUCKET,
    storagePath,
  );
}

function normalizeMonth(value: number): number {
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 12
  ) {
    return 1;
  }

  return value;
}

function normalizeFeedLimit(
  value: number | undefined,
): number {
  if (
    !Number.isInteger(value) ||
    !value ||
    value < 1
  ) {
    return SOCIAL_FEED_BATCH_SIZE;
  }

  return Math.min(
    MAX_FEED_POSTS,
    value,
  );
}

function encodeFeedCursor(
  payload: FeedCursorPayload,
): string {
  return Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");
}

function decodeFeedCursor(
  cursor: string,
): FeedCursorPayload {
  if (
    cursor.length === 0 ||
    cursor.length > 5000
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  let parsed: unknown;

  try {
    const text = Buffer.from(
      cursor,
      "base64url",
    ).toString("utf8");
    parsed = JSON.parse(text);
  } catch {
    throw new InvalidSocialFeedCursorError();
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  const candidate =
    parsed as Record<string, unknown>;

  if (
    candidate.version !==
    FEED_CURSOR_VERSION ||
    typeof candidate.snapshotAt !==
      "string" ||
    !Array.isArray(
      candidate.remainingIds,
    ) ||
    typeof candidate.hasMoreAfterWindow !==
      "boolean"
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  const snapshotAtMilliseconds =
    Date.parse(candidate.snapshotAt);

  if (
    Number.isNaN(
      snapshotAtMilliseconds,
    )
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  const boundaryCreatedAt =
    candidate.boundaryCreatedAt;
  const boundaryId =
    candidate.boundaryId;

  if (
    !(
      (
        boundaryCreatedAt === null &&
        boundaryId === null
      ) ||
      (
        typeof boundaryCreatedAt ===
          "string" &&
        typeof boundaryId === "string"
      )
    )
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  if (
    typeof boundaryCreatedAt ===
      "string" &&
    Number.isNaN(
      Date.parse(boundaryCreatedAt),
    )
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  if (
    typeof boundaryId === "string" &&
    !UUID_PATTERN.test(boundaryId)
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  if (
    candidate.remainingIds.length >
    MAX_FEED_CANDIDATES
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  const remainingIds =
    candidate.remainingIds.filter(
      (value): value is string =>
        typeof value === "string" &&
        UUID_PATTERN.test(value),
    );

  if (
    remainingIds.length !==
    candidate.remainingIds.length ||
    new Set(remainingIds).size !==
      remainingIds.length
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  if (
    candidate.hasMoreAfterWindow &&
    (
      boundaryCreatedAt === null ||
      boundaryId === null
    )
  ) {
    throw new InvalidSocialFeedCursorError();
  }

  return {
    version: 1,
    snapshotAt: new Date(
      snapshotAtMilliseconds,
    ).toISOString(),
    boundaryCreatedAt:
      typeof boundaryCreatedAt ===
      "string"
        ? new Date(
            boundaryCreatedAt,
          ).toISOString()
        : null,
    boundaryId:
      typeof boundaryId === "string"
        ? boundaryId
        : null,
    remainingIds,
    hasMoreAfterWindow:
      candidate.hasMoreAfterWindow,
  };
}

function getBoundaryFromCursor(
  cursor: FeedCursorPayload,
): FeedWindowBoundary | null {
  if (
    !cursor.boundaryCreatedAt ||
    !cursor.boundaryId
  ) {
    return null;
  }

  return {
    createdAt: new Date(
      cursor.boundaryCreatedAt,
    ),
    id: cursor.boundaryId,
  };
}

async function findFeedWindow(
  currentMonth: number,
  snapshotAt: Date,
  boundary: FeedWindowBoundary | null,
  take: number,
) {
  if (boundary) {
    return prisma.travelPost.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        createdAt: {
          lte: snapshotAt,
        },
        AND: [
          {
            OR: [
              {
                seasonMonths: {
                  isEmpty: true,
                },
              },
              {
                seasonMonths: {
                  has: currentMonth,
                },
              },
            ],
          },
          {
            OR: [
              {
                createdAt: {
                  lt: boundary.createdAt,
                },
              },
              {
                createdAt:
                  boundary.createdAt,
                id: {
                  lt: boundary.id,
                },
              },
            ],
          },
        ],
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      take,
      select: FEED_POST_SELECT,
    });
  }

  return prisma.travelPost.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      createdAt: {
        lte: snapshotAt,
      },
      OR: [
        {
          seasonMonths: {
            isEmpty: true,
          },
        },
        {
          seasonMonths: {
            has: currentMonth,
          },
        },
      ],
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take,
    select: FEED_POST_SELECT,
  });
}

async function findFeedPostsByIds(
  currentMonth: number,
  snapshotAt: Date,
  ids: string[],
) {
  return prisma.travelPost.findMany({
    where: {
      id: {
        in: ids,
      },
      status: "PUBLISHED",
      deletedAt: null,
      createdAt: {
        lte: snapshotAt,
      },
      OR: [
        {
          seasonMonths: {
            isEmpty: true,
          },
        },
        {
          seasonMonths: {
            has: currentMonth,
          },
        },
      ],
    },
    select: FEED_POST_SELECT,
  });
}

type FeedQueryPost =
  Awaited<
    ReturnType<
      typeof findFeedPostsByIds
    >
  >[number];

async function mapPublicFeedPosts(
  posts: FeedQueryPost[],
  currentUserId: string | null,
): Promise<PublicSocialFeedPost[]> {
  const viewerReactions =
    currentUserId && posts.length > 0
      ? await prisma.travelPostReaction.findMany({
          where: {
            userId: currentUserId,
            postId: {
              in: posts.map(
                (post) => post.id,
              ),
            },
          },
          select: {
            postId: true,
            type: true,
          },
        })
      : [];

  const viewerReactionByPostId =
    new Map(
      viewerReactions.map(
        (reaction) => [
          reaction.postId,
          reaction.type as ViewerReactionType,
        ],
      ),
    );

  const viewerSaves =
    currentUserId && posts.length > 0
      ? await prisma.travelPostSave.findMany({
          where: {
            userId: currentUserId,
            postId: {
              in: posts.map(
                (post) => post.id,
              ),
            },
          },
          select: {
            postId: true,
          },
        })
      : [];

  const viewerSavedPostIds =
    new Set(
      viewerSaves.map(
        (savedPost) =>
          savedPost.postId,
      ),
    );

  return posts.map((post) => {
    const primaryPlaceLink =
      post.places[0] ?? null;
    const placeFallbackImage =
      primaryPlaceLink?.place.images[0] ??
      null;
    const authorProfile =
      post.author?.profile ?? null;

    const uploadedMedia = post.media
      .map((media) => {
        const url =
          getPublicTravelPostMediaUrl(
            media.storagePath,
          );

        if (!url) {
          return null;
        }

        return {
          id: media.id,
          type: media.type,
          url,
          mimeType: media.mimeType,
          altText:
            media.altText ??
            post.headline ??
            "Media du lịch VTripPlanner",
          sortOrder: media.sortOrder,
        } satisfies PublicSocialFeedMedia;
      })
      .filter(
        (
          media,
        ): media is PublicSocialFeedMedia =>
          media !== null,
      );

    const placeFallbackUrl =
      getPublicPlaceImageUrl(
        placeFallbackImage?.storagePath ??
          null,
      );

    const fallbackMedia:
      PublicSocialFeedMedia[] =
      uploadedMedia.length === 0 &&
      placeFallbackUrl &&
      primaryPlaceLink
        ? [
            {
              id: `place-${primaryPlaceLink.place.id}`,
              type: "IMAGE",
              url: placeFallbackUrl,
              mimeType: "image/*",
              altText:
                placeFallbackImage?.altText ??
                primaryPlaceLink.place.name,
              sortOrder: 0,
            },
          ]
        : [];

    const resolvedMedia =
      uploadedMedia.length > 0
        ? uploadedMedia
        : fallbackMedia;
    const coverMedia =
      resolvedMedia[0] ?? null;

    const sourceTripPlaceCount =
      post.sourceTrip
        ? new Set(
            post.sourceTrip.days.flatMap(
              (day) =>
                day.activities.flatMap(
                  (activity) =>
                    activity.placeId
                      ? [activity.placeId]
                      : [],
                ),
            ),
          ).size
        : 0;

    return {
      id: post.id,
      type: post.type,
      headline: post.headline,
      caption: post.caption,
      seasonMonths: post.seasonMonths,
      publishedAt:
        post.publishedAt ??
        post.createdAt,
      sourceName:
        authorProfile?.displayName ??
        authorProfile?.fullName ??
        (post.author
          ? "Người dùng VTripPlanner"
          : "VTripPlanner"),
      sourceAvatarUrl:
        authorProfile?.avatarUrl ?? null,
      isSystemPost:
        post.author === null,
      viewerCanManage:
        post.type === "USER_TRIP" &&
        currentUserId ===
          post.author?.id,
      coverImageUrl:
        coverMedia?.url ?? null,
      coverImageAlt:
        coverMedia?.altText ??
        post.headline ??
        "Ảnh du lịch VTripPlanner",
      mediaType:
        coverMedia?.type ?? null,
      mediaMimeType:
        coverMedia?.mimeType ?? null,
      media: resolvedMedia,
      sourceTrip: post.sourceTrip
        ? {
            id: post.sourceTrip.id,
            title: post.sourceTrip.title,
            destinationName:
              post.sourceTrip
                .destinationProvince
                ?.name ?? null,
            dayCount:
              post.sourceTrip.days.length,
            placeCount:
              sourceTripPlaceCount,
          }
        : null,
      viewerReaction:
        viewerReactionByPostId.get(
          post.id,
        ) ?? null,
      viewerSaved:
        viewerSavedPostIds.has(
          post.id,
        ),
      places: post.places.map(
        (placeLink) => ({
          id: placeLink.place.id,
          name: placeLink.place.name,
          provinceName:
            placeLink.place.province.name,
          isPrimary:
            placeLink.isPrimary,
        }),
      ),
      reactionCount:
        post._count.reactions,
      commentCount:
        post._count.comments,
    };
  });
}

async function loadRankedFeedWindow(
  currentMonth: number,
  snapshotAt: Date,
  boundary: FeedWindowBoundary | null,
  currentUserId: string | null,
  candidateLimit: number,
) {
  const [
    rows,
    personalizationSignals,
  ] = await Promise.all([
    findFeedWindow(
      currentMonth,
      snapshotAt,
      boundary,
      candidateLimit + 1,
    ),
    currentUserId
      ? getReactionInterestSignals(
          currentUserId,
        )
      : Promise.resolve(null),
  ]);

  const hasMoreAfterWindow =
    rows.length > candidateLimit;
  const candidates =
    rows.slice(0, candidateLimit);
  const lastCandidate =
    candidates.at(-1) ?? null;
  const nextBoundary =
    lastCandidate
      ? {
          createdAt:
            lastCandidate.createdAt,
          id: lastCandidate.id,
        }
      : boundary;

  return {
    rankedPosts: rankFeedCandidates(
      candidates,
      currentMonth,
      personalizationSignals,
      candidates.length,
    ),
    boundary: nextBoundary,
    hasMoreAfterWindow,
  };
}

function buildCursor(
  snapshotAt: Date,
  boundary: FeedWindowBoundary | null,
  remainingIds: string[],
  hasMoreAfterWindow: boolean,
): string | null {
  const hasMore =
    remainingIds.length > 0 ||
    hasMoreAfterWindow;

  if (!hasMore || !boundary) {
    return null;
  }

  return encodeFeedCursor({
    version: 1,
    snapshotAt:
      snapshotAt.toISOString(),
    boundaryCreatedAt:
      boundary.createdAt.toISOString(),
    boundaryId: boundary.id,
    remainingIds,
    hasMoreAfterWindow,
  });
}

export async function getPublicSocialFeedPage(
  requestedMonth: number,
  options:
    GetPublicSocialFeedPageOptions = {},
): Promise<PublicSocialFeedPage> {
  const currentMonth =
    normalizeMonth(requestedMonth);
  const currentUser =
    await getCurrentUser();
  const currentUserId =
    currentUser?.id ?? null;
  const limit =
    normalizeFeedLimit(
      options.limit ??
        (
          options.cursor
            ? SOCIAL_FEED_BATCH_SIZE
            : MAX_FEED_POSTS
        ),
    );

  const decodedCursor =
    options.cursor
      ? decodeFeedCursor(
          options.cursor,
        )
      : null;
  const snapshotAt =
    decodedCursor
      ? new Date(
          decodedCursor.snapshotAt,
        )
      : new Date();
  const sessionKey =
    snapshotAt.toISOString();
  let boundary =
    decodedCursor
      ? getBoundaryFromCursor(
          decodedCursor,
        )
      : null;
  let hasMoreAfterWindow =
    decodedCursor
      ?.hasMoreAfterWindow ??
    false;

  if (
    decodedCursor &&
    decodedCursor.remainingIds.length >
      0
  ) {
    const remainingRows =
      await findFeedPostsByIds(
        currentMonth,
        snapshotAt,
        decodedCursor.remainingIds,
      );
    const remainingById =
      new Map(
        remainingRows.map(
          (post) => [
            post.id,
            post,
          ],
        ),
      );
    const orderedRemaining =
      decodedCursor.remainingIds
        .map((id) =>
          remainingById.get(id),
        )
        .filter(
          (
            post,
          ): post is FeedQueryPost =>
            post !== undefined,
        );

    const selected =
      orderedRemaining.slice(
        0,
        limit,
      );
    const leftoverIds =
      orderedRemaining
        .slice(limit)
        .map((post) => post.id);

    if (selected.length > 0) {
      const nextCursor =
        buildCursor(
          snapshotAt,
          boundary,
          leftoverIds,
          hasMoreAfterWindow,
        );

      return {
        currentMonth,
        posts:
          await mapPublicFeedPosts(
            selected,
            currentUserId,
          ),
        hasMore:
          nextCursor !== null,
        nextCursor,
        sessionKey,
      };
    }

    if (!hasMoreAfterWindow) {
      return {
        currentMonth,
        posts: [],
        hasMore: false,
        nextCursor: null,
        sessionKey,
      };
    }
  }

  if (
    decodedCursor &&
    !hasMoreAfterWindow
  ) {
    return {
      currentMonth,
      posts: [],
      hasMore: false,
      nextCursor: null,
      sessionKey,
    };
  }

  const candidateLimit =
    decodedCursor
      ? MAX_FEED_CANDIDATES
      : currentUserId
        ? MAX_FEED_CANDIDATES
        : MAX_FEED_POSTS;

  const rankedWindow =
    await loadRankedFeedWindow(
      currentMonth,
      snapshotAt,
      boundary,
      currentUserId,
      candidateLimit,
    );

  boundary = rankedWindow.boundary;
  hasMoreAfterWindow =
    rankedWindow.hasMoreAfterWindow;

  const selected =
    rankedWindow.rankedPosts.slice(
      0,
      limit,
    );
  const leftoverIds =
    rankedWindow.rankedPosts
      .slice(limit)
      .map((post) => post.id);
  const nextCursor =
    buildCursor(
      snapshotAt,
      boundary,
      leftoverIds,
      hasMoreAfterWindow,
    );

  return {
    currentMonth,
    posts:
      await mapPublicFeedPosts(
        selected,
        currentUserId,
      ),
    hasMore:
      nextCursor !== null,
    nextCursor,
    sessionKey,
  };
}

export async function getPublicSocialFeed(
  requestedMonth: number,
): Promise<PublicSocialFeedPage> {
  return getPublicSocialFeedPage(
    requestedMonth,
    {
      limit: MAX_FEED_POSTS,
    },
  );
}
