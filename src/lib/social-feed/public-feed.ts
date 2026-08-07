import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  getReactionInterestSignals,
  type TripReactionInterestSignals,
} from "@/lib/trip-planner/reaction-interest-signals";

const PLACE_IMAGE_BUCKET = "place-images";
const TRAVEL_POST_MEDIA_BUCKET = "travel-post-media";
const MAX_FEED_POSTS = 20;
const MAX_FEED_CANDIDATES = 60;
const MAX_FEED_MEDIA = 10;
const SEASONAL_GUIDE_BOOST = 12;
const MAX_PERSONALIZATION_BOOST = 10;
const MAX_PERSONALIZED_STREAK = 3;

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

type RankedFeedCandidate<T extends FeedRankingCandidate> = {
  post: T;
  baseScore: number;
  personalizationBoost: number;
  totalScore: number;
  publishedAtMs: number;
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
  signals: TripReactionInterestSignals | null,
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
  signals: TripReactionInterestSignals | null,
): T[] {
  const ranked: RankedFeedCandidate<T>[] =
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
      .slice(0, MAX_FEED_POSTS)
      .map((item) => item.post);
  }

  const remaining = [...ranked];
  const selected: T[] = [];
  let personalizedStreak = 0;

  while (
    remaining.length > 0 &&
    selected.length < MAX_FEED_POSTS
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

export async function getPublicSocialFeed(
  requestedMonth: number,
): Promise<PublicSocialFeed> {
  const currentMonth =
    normalizeMonth(requestedMonth);
  const currentUser =
    await getCurrentUser();

  const [
    candidatePosts,
    personalizationSignals,
  ] = await Promise.all([
    prisma.travelPost.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
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
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: currentUser
        ? MAX_FEED_CANDIDATES
        : MAX_FEED_POSTS,
      select: {
        id: true,
        type: true,
        headline: true,
        caption: true,
        seasonMonths: true,
        publishedAt: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        media: {
          orderBy: {
            sortOrder: "asc",
          },
          take: MAX_FEED_MEDIA,
          select: {
            id: true,
            type: true,
            storagePath: true,
            mimeType: true,
            altText: true,
            sortOrder: true,
          },
        },
        sourceTrip: {
          select: {
            id: true,
            title: true,
            destinationProvince: {
              select: {
                name: true,
              },
            },
            days: {
              orderBy: {
                dayNumber: "asc",
              },
              select: {
                activities: {
                  select: {
                    placeId: true,
                  },
                },
              },
            },
          },
        },
        places: {
          orderBy: [
            {
              isPrimary: "desc",
            },
            {
              sortOrder: "asc",
            },
          ],
          select: {
            isPrimary: true,
            place: {
              select: {
                id: true,
                name: true,
                province: {
                  select: {
                    name: true,
                  },
                },
                images: {
                  orderBy: [
                    {
                      isCover: "desc",
                    },
                    {
                      sortOrder: "asc",
                    },
                  ],
                  take: 1,
                  select: {
                    storagePath: true,
                    altText: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: {
              where: {
                status: "PUBLISHED",
                deletedAt: null,
              },
            },
          },
        },
      },
    }),
    currentUser
      ? getReactionInterestSignals(
          currentUser.id,
        )
      : Promise.resolve(null),
  ]);

  const posts = rankFeedCandidates(
    candidatePosts,
    currentMonth,
    personalizationSignals,
  );

  const viewerReactions =
    currentUser && posts.length > 0
      ? await prisma.travelPostReaction.findMany({
          where: {
            userId: currentUser.id,
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
      viewerReactions.map((reaction) => [
        reaction.postId,
        reaction.type as ViewerReactionType,
      ]),
    );

  const viewerSaves =
    currentUser && posts.length > 0
      ? await prisma.travelPostSave.findMany({
          where: {
            userId: currentUser.id,
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
        (savedPost) => savedPost.postId,
      ),
    );

  return {
    currentMonth,
    posts: posts.map((post) => {
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
          currentUser?.id === post.author?.id,
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
                  .destinationProvince?.name ??
                null,
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
    }),
  };
}
