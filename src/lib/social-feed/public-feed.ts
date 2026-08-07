import { prisma } from "@/lib/prisma";

const PLACE_IMAGE_BUCKET = "place-images";
const MAX_FEED_POSTS = 20;

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

function getPublicPlaceImageUrl(storagePath: string | null): string | null {
  if (!storagePath) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${PLACE_IMAGE_BUCKET}/${encodedPath}`;
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

  return {
    currentMonth,
    posts: posts.map((post) => {
      const primaryPlaceLink = post.places[0] ?? null;
      const coverImage = primaryPlaceLink?.place.images[0] ?? null;
      const authorProfile = post.author?.profile ?? null;

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
          "VTripPlanner",
        sourceAvatarUrl: authorProfile?.avatarUrl ?? null,
        isSystemPost: post.author === null,
        coverImageUrl: getPublicPlaceImageUrl(
          coverImage?.storagePath ?? null,
        ),
        coverImageAlt:
          coverImage?.altText ??
          primaryPlaceLink?.place.name ??
          post.headline ??
          "Ảnh du lịch VTripPlanner",
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
