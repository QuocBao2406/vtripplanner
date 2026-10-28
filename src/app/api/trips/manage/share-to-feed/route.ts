import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { TravelPostType, TravelPostStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

function errorResponse(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return errorResponse(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để chia sẻ chuyến đi.");
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Dữ liệu không hợp lệ.");
  }

  const { tripId, headline, caption } = body;

  if (!tripId) {
    return errorResponse(400, "TRIP_ID_REQUIRED", "Thiếu tripId.");
  }

  try {
    // Find trip with its activities and places
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, ownerUserId: authUser.id, deletedAt: null },
      include: {
        days: {
          include: {
            activities: {
              include: {
                place: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return errorResponse(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi.");
    }

    // Collect distinct place IDs from activities
    const placeIds = new Set<string>();
    for (const day of trip.days) {
      for (const act of day.activities) {
        if (act.place?.id) {
          placeIds.add(act.place.id);
        }
      }
    }

    const finalHeadline =
      headline?.trim() ||
      `Chuyến đi ${trip.destinationName} (${trip.days.length || 1} ngày): ${trip.title}`;

    const finalCaption =
      caption?.trim() ||
      `Mình vừa hoàn thành/lên kế hoạch cho hành trình khám phá ${trip.destinationName} từ ${trip.originName}. Lịch trình gồm ${trip.days.length} ngày và dự kiến ngân sách ${trip.totalBudget ? `${Number(trip.totalBudget).toLocaleString("vi-VN")}đ` : "tiết kiệm"}. Chia sẻ để mọi người cùng tham khảo nhé!`;

    // Check if a post for this trip already exists
    let post = await prisma.travelPost.findFirst({
      where: {
        sourceTripId: tripId,
        authorUserId: authUser.id,
        deletedAt: null,
      },
    });

    if (post) {
      post = await prisma.travelPost.update({
        where: { id: post.id },
        data: {
          headline: finalHeadline,
          caption: finalCaption,
          status: TravelPostStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    } else {
      post = await prisma.travelPost.create({
        data: {
          authorUserId: authUser.id,
          sourceTripId: tripId,
          type: TravelPostType.USER_TRIP,
          status: TravelPostStatus.PUBLISHED,
          headline: finalHeadline,
          caption: finalCaption,
          publishedAt: new Date(),
        },
      });
    }

    // Connect places
    let sortIdx = 0;
    for (const pId of placeIds) {
      const existingPlaceLink = await prisma.travelPostPlace.findUnique({
        where: {
          postId_placeId: {
            postId: post.id,
            placeId: pId,
          },
        },
      });

      if (!existingPlaceLink) {
        await prisma.travelPostPlace.create({
          data: {
            postId: post.id,
            placeId: pId,
            isPrimary: sortIdx === 0,
            sortOrder: sortIdx,
          },
        });
      }
      sortIdx++;
    }

    // Revalidate relevant social paths
    try {
      revalidatePath("/social");
      revalidatePath("/");
    } catch {
      // Revalidation failure shouldn't block response
    }

    return NextResponse.json({
      ok: true,
      post: {
        id: post.id,
        headline: post.headline,
        caption: post.caption,
        status: post.status,
      },
      message: "Đã chia sẻ chuyến đi lên Bảng tin cộng đồng thành công!",
    });
  } catch (error) {
    console.error("Share trip to feed failed:", error);
    return errorResponse(500, "SHARE_FAILED", "Không thể chia sẻ chuyến đi lên cộng đồng.");
  }
}
