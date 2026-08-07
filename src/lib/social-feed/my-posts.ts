import type {
  PublicSocialFeedMedia,
  PublicSocialFeedPost,
} from "@/lib/social-feed/public-feed";
import { prisma } from "@/lib/prisma";

const PLACE_IMAGE_BUCKET = "place-images";
const TRAVEL_POST_MEDIA_BUCKET =
  "travel-post-media";
const MAX_MY_SOCIAL_POSTS = 30;
const MAX_POST_MEDIA = 10;

type ViewerReactionType =
  | "LIKE"
  | "LOVE"
  | "WOW";

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

export async function getMyPublishedSocialPosts(
  userId: string,
): Promise<PublicSocialFeedPost[]> {
  const posts =
    await prisma.travelPost.findMany({
      where: {
        authorUserId: userId,
        type: "USER_TRIP",
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: MAX_MY_SOCIAL_POSTS,
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
          take: MAX_POST_MEDIA,
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
        reactions: {
          where: {
            userId,
          },
          take: 1,
          select: {
            type: true,
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
        "Người dùng VTripPlanner",
      sourceAvatarUrl:
        authorProfile?.avatarUrl ?? null,
      isSystemPost: false,
      viewerCanManage: true,
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
        (post.reactions[0]?.type as
          | ViewerReactionType
          | undefined) ??
        null,
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
