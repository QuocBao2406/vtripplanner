import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const PLACE_IMAGE_BUCKET = "place-images";
const TRAVEL_POST_MEDIA_BUCKET = "travel-post-media";
const MAX_FEED_POSTS = 20;

type ViewerReactionType = "LIKE" | "LOVE" | "WOW";

export type PublicSocialFeedPost = {
  id: string;
  type: "USER_TRIP" | "SEASONAL_GUIDE" | "EVERGREEN_GUIDE" | "PROMOTED";
  headline: string | null;
  caption: string | null;
  seasonMonths: number[];
  publishedAt: Date;
  sourceName: string;
  sourceAvatarUrl: string | null;
  isSystemPost: boolean;
  coverImageUrl: string | null;
  coverImageAlt: string;
  mediaType: "IMAGE" | "VIDEO" | null;
  mediaMimeType: string | null;
  viewerReaction: ViewerReactionType | null;
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
}

function getPublicPlaceImageUrl(storagePath: string | null): string | null {
  return getPublicStorageUrl(PLACE_IMAGE_BUCKET, storagePath);
}

function getPublicTravelPostMediaUrl(
  storagePath: string | null,
): string | null {
  return getPublicStorageUrl(TRAVEL_POST_MEDIA_BUCKET, storagePath);
}

function normalizeMonth(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    return 1;
  }

  return value;
}

export async function getPublicSocialFeed(
  requestedMonth: number,
): Promise<PublicSocialFeed> {
  const currentMonth = normalizeMonth(requestedMonth);
  const currentUser = await getCurrentUser();

  const posts = await prisma.travelPost.findMany({
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
    take: MAX_FEED_POSTS,
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
        take: 1,
        select: {
          type: true,
          storagePath: true,
          mimeType: true,
          altText: true,
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
  });

  const viewerReactions =
    currentUser && posts.length > 0
      ? await prisma.travelPostReaction.findMany({
          where: {
            userId: currentUser.id,
            postId: {
              in: posts.map((post) => post.id),
            },
          },
          select: {
            postId: true,
            type: true,
          },
        })
      : [];

  const viewerReactionByPostId = new Map(
    viewerReactions.map((reaction) => [
      reaction.postId,
      reaction.type as ViewerReactionType,
    ]),
  );

  return {
    currentMonth,
    posts: posts.map((post) => {
      const postMedia = post.media[0] ?? null;
      const primaryPlaceLink = post.places[0] ?? null;
      const placeFallbackImage = primaryPlaceLink?.place.images[0] ?? null;
      const authorProfile = post.author?.profile ?? null;

      const postMediaUrl = getPublicTravelPostMediaUrl(
        postMedia?.storagePath ?? null,
      );

      const placeFallbackUrl = getPublicPlaceImageUrl(
        placeFallbackImage?.storagePath ?? null,
      );

      const resolvedMediaUrl = postMediaUrl ?? placeFallbackUrl;

      return {
        id: post.id,
        type: post.type,
        headline: post.headline,
        caption: post.caption,
        seasonMonths: post.seasonMonths,
        publishedAt: post.publishedAt ?? post.createdAt,
        sourceName:
          authorProfile?.displayName ??
          authorProfile?.fullName ??
          (post.author ? "Người dùng VTripPlanner" : "VTripPlanner"),
        sourceAvatarUrl: authorProfile?.avatarUrl ?? null,
        isSystemPost: post.author === null,
        coverImageUrl: resolvedMediaUrl,
        coverImageAlt:
          postMedia?.altText ??
          placeFallbackImage?.altText ??
          primaryPlaceLink?.place.name ??
          post.headline ??
          "Ảnh du lịch VTripPlanner",
        mediaType: postMediaUrl
          ? postMedia?.type ?? null
          : placeFallbackUrl
            ? "IMAGE"
            : null,
        mediaMimeType: postMediaUrl
          ? postMedia?.mimeType ?? null
          : placeFallbackUrl
            ? "image/*"
            : null,
        viewerReaction:
          viewerReactionByPostId.get(post.id) ?? null,
        places: post.places.map((placeLink) => ({
          id: placeLink.place.id,
          name: placeLink.place.name,
          provinceName: placeLink.place.province.name,
          isPrimary: placeLink.isPrimary,
        })),
        reactionCount: post._count.reactions,
        commentCount: post._count.comments,
      };
    }),
  };
}
