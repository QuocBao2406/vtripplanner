import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  TravelPostMediaType,
  TravelPostStatus,
  TravelPostType,
} from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TRAVEL_POST_MEDIA_BUCKET = "travel-post-media";
const MAX_CAPTION_LENGTH = 2000;
const MAX_MEDIA_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const MAX_SAVED_TRIPS = 20;
const MAX_SOURCE_TRIP_PLACE_LINKS = 8;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_MEDIA_TYPES = new Map<
  string,
  { extension: string; type: TravelPostMediaType }
>([
  ["image/jpeg", { extension: "jpg", type: TravelPostMediaType.IMAGE }],
  ["image/png", { extension: "png", type: TravelPostMediaType.IMAGE }],
  ["image/webp", { extension: "webp", type: TravelPostMediaType.IMAGE }],
  ["video/mp4", { extension: "mp4", type: TravelPostMediaType.VIDEO }],
  ["video/webm", { extension: "webm", type: TravelPostMediaType.VIDEO }],
]);

function errorResponse(
  status: number,
  error: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
    },
    { status },
  );
}

async function getAuthenticatedApplicationUser() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return {
      ok: false as const,
      response: errorResponse(
        401,
        "AUTH_REQUIRED",
        "Vui lòng đăng nhập để chia sẻ chuyến đi.",
      ),
    };
  }

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
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
  });

  if (!applicationUser) {
    return {
      ok: false as const,
      response: errorResponse(
        403,
        "APPLICATION_USER_REQUIRED",
        "Tài khoản chưa sẵn sàng để đăng bài.",
      ),
    };
  }

  return {
    ok: true as const,
    authUser,
    applicationUser,
  };
}

export async function GET(): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const applicationUserId =
    authorization.applicationUser.id;

  const profile =
    authorization.applicationUser.profile;

  const savedTrips = await prisma.trip.findMany({
    where: {
      ownerUserId: applicationUserId,
      deletedAt: null,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        startDate: "desc",
      },
    ],
    take: MAX_SAVED_TRIPS,
    select: {
      id: true,
      title: true,
      destinationProvince: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          days: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    viewer: {
      displayName:
        profile?.displayName ??
        profile?.fullName ??
        authorization.authUser.email ??
        "Bạn",
      avatarUrl: profile?.avatarUrl ?? null,
    },
    savedTrips: savedTrips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      destinationName:
        trip.destinationProvince?.name ?? null,
      dayCount: trip._count.days,
    })),
  });
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      "INVALID_FORM_DATA",
      "Không thể đọc dữ liệu bài đăng.",
    );
  }

  const rawCaption = formData.get("caption");
  const rawSourceTripId =
    formData.get("sourceTripId");
  const mediaEntries = formData
    .getAll("media")
    .filter(
      (entry): entry is File =>
        entry instanceof File &&
        entry.size > 0,
    );

  const caption =
    typeof rawCaption === "string"
      ? rawCaption.trim()
      : "";

  const sourceTripId =
    typeof rawSourceTripId === "string" &&
    rawSourceTripId.trim()
      ? rawSourceTripId.trim()
      : null;

  if (!caption) {
    return errorResponse(
      400,
      "CAPTION_REQUIRED",
      "Hãy viết vài dòng về chuyến đi của bạn.",
    );
  }

  if (caption.length > MAX_CAPTION_LENGTH) {
    return errorResponse(
      400,
      "CAPTION_TOO_LONG",
      `Nội dung bài viết tối đa ${MAX_CAPTION_LENGTH} ký tự.`,
    );
  }

  if (mediaEntries.length === 0) {
    return errorResponse(
      400,
      "MEDIA_REQUIRED",
      "Hãy chọn ảnh hoặc video để đăng.",
    );
  }

  if (mediaEntries.length > MAX_IMAGE_COUNT) {
    return errorResponse(
      400,
      "TOO_MANY_MEDIA",
      `Mỗi bài đăng tối đa ${MAX_IMAGE_COUNT} ảnh.`,
    );
  }

  const mediaDefinitions = mediaEntries.map(
    (mediaEntry) =>
      ALLOWED_MEDIA_TYPES.get(mediaEntry.type) ??
      null,
  );

  if (
    mediaDefinitions.some(
      (definition) => definition === null,
    )
  ) {
    return errorResponse(
      400,
      "MEDIA_TYPE_NOT_ALLOWED",
      "Chỉ hỗ trợ JPEG, PNG, WebP, MP4 hoặc WebM.",
    );
  }

  const resolvedMediaDefinitions =
    mediaDefinitions.filter(
      (
        definition,
      ): definition is NonNullable<
        (typeof mediaDefinitions)[number]
      > => definition !== null,
    );

  const videoCount =
    resolvedMediaDefinitions.filter(
      (definition) =>
        definition.type ===
        TravelPostMediaType.VIDEO,
    ).length;

  if (
    videoCount > 0 &&
    mediaEntries.length !== 1
  ) {
    return errorResponse(
      400,
      "MIXED_MEDIA_NOT_ALLOWED",
      "Video phải được đăng riêng. Không thể trộn video với nhiều ảnh trong cùng bài.",
    );
  }

  for (const mediaEntry of mediaEntries) {
    if (mediaEntry.size > MAX_MEDIA_BYTES) {
      return errorResponse(
        400,
        "MEDIA_TOO_LARGE",
        "Mỗi ảnh hoặc video phải có dung lượng không quá 6 MB.",
      );
    }
  }

  const applicationUserId =
    authorization.applicationUser.id;

  let sourceTrip:
    | {
        id: string;
        placeIds: string[];
      }
    | null = null;

  if (sourceTripId) {
    if (!UUID_PATTERN.test(sourceTripId)) {
      return errorResponse(
        400,
        "INVALID_SOURCE_TRIP_ID",
        "Chuyến đi được gắn vào bài đăng không hợp lệ.",
      );
    }

    const trip = await prisma.trip.findFirst({
      where: {
        id: sourceTripId,
        ownerUserId: applicationUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        days: {
          orderBy: {
            dayNumber: "asc",
          },
          select: {
            activities: {
              orderBy: {
                sortOrder: "asc",
              },
              select: {
                placeId: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return errorResponse(
        404,
        "SOURCE_TRIP_NOT_FOUND",
        "Không tìm thấy chuyến đi thuộc tài khoản của bạn.",
      );
    }

    const uniquePlaceIds = Array.from(
      new Set(
        trip.days.flatMap((day) =>
          day.activities.flatMap(
            (activity) =>
              activity.placeId
                ? [activity.placeId]
                : [],
          ),
        ),
      ),
    ).slice(0, MAX_SOURCE_TRIP_PLACE_LINKS);

    sourceTrip = {
      id: trip.id,
      placeIds: uniquePlaceIds,
    };
  }

  const supabase = await createClient();
  const authorLabel =
    authorization.authUser.email ??
    "người dùng VTripPlanner";

  const uploadedMedia: Array<{
    type: TravelPostMediaType;
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    altText: string;
    sortOrder: number;
  }> = [];

  for (
    let index = 0;
    index < mediaEntries.length;
    index += 1
  ) {
    const mediaEntry = mediaEntries[index];
    const mediaDefinition =
      resolvedMediaDefinitions[index];

    const storagePath =
      `${authorization.authUser.id}/` +
      `${randomUUID()}.${mediaDefinition.extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from(TRAVEL_POST_MEDIA_BUCKET)
        .upload(storagePath, mediaEntry, {
          cacheControl: "3600",
          contentType: mediaEntry.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "Travel post media upload failed:",
        uploadError,
      );

      if (uploadedMedia.length > 0) {
        const { error: cleanupError } =
          await supabase.storage
            .from(TRAVEL_POST_MEDIA_BUCKET)
            .remove(
              uploadedMedia.map(
                (media) => media.storagePath,
              ),
            );

        if (cleanupError) {
          console.error(
            "Travel post media cleanup after upload failure failed:",
            cleanupError,
          );
        }
      }

      return errorResponse(
        500,
        "MEDIA_UPLOAD_FAILED",
        "Không thể tải media lên. Vui lòng thử lại.",
      );
    }

    const mediaAltText = (
      mediaDefinition.type ===
      TravelPostMediaType.IMAGE
        ? `Ảnh ${index + 1} trong bài chia sẻ của ${authorLabel}`
        : `Video chuyến đi của ${authorLabel}`
    ).slice(0, 255);

    uploadedMedia.push({
      type: mediaDefinition.type,
      storagePath,
      mimeType: mediaEntry.type,
      fileSizeBytes: mediaEntry.size,
      altText: mediaAltText,
      sortOrder: index,
    });
  }

  try {
    const now = new Date();

    const post =
      await prisma.travelPost.create({
        data: {
          type: TravelPostType.USER_TRIP,
          status:
            TravelPostStatus.PUBLISHED,
          caption,
          seasonMonths: [],
          publishedAt: now,
          author: {
            connect: {
              id: applicationUserId,
            },
          },
          sourceTrip: sourceTrip
            ? {
                connect: {
                  id: sourceTrip.id,
                },
              }
            : undefined,
          media: {
            create: uploadedMedia,
          },
          places:
            sourceTrip &&
            sourceTrip.placeIds.length > 0
              ? {
                  create:
                    sourceTrip.placeIds.map(
                      (placeId, index) => ({
                        place: {
                          connect: {
                            id: placeId,
                          },
                        },
                        isPrimary:
                          index === 0,
                        sortOrder: index,
                      }),
                    ),
                }
              : undefined,
        },
        select: {
          id: true,
        },
      });

    revalidatePath("/");

    return NextResponse.json(
      {
        ok: true,
        postId: post.id,
        sourceTripId:
          sourceTrip?.id ?? null,
        mediaCount: uploadedMedia.length,
        message:
          "Đã đăng chuyến đi của bạn.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Travel post database create failed:",
      error,
    );

    const { error: cleanupError } =
      await supabase.storage
        .from(TRAVEL_POST_MEDIA_BUCKET)
        .remove(
          uploadedMedia.map(
            (media) => media.storagePath,
          ),
        );

    if (cleanupError) {
      console.error(
        "Travel post media cleanup after database failure failed:",
        cleanupError,
      );
    }

    return errorResponse(
      500,
      "POST_CREATE_FAILED",
      "Không thể tạo bài đăng. Vui lòng thử lại.",
    );
  }
}
