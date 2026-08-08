import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_NOTIFICATIONS = 15;

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
    {
      status,
    },
  );
}

async function getAuthenticatedApplicationUser() {
  const authUser =
    await getCurrentUser();

  if (!authUser) {
    return {
      ok: false as const,
      response: errorResponse(
        401,
        "AUTH_REQUIRED",
        "Vui lòng đăng nhập để xem thông báo.",
      ),
    };
  }

  const applicationUser =
    await prisma.user.findUnique({
      where: {
        id: authUser.id,
      },
      select: {
        id: true,
      },
    });

  if (!applicationUser) {
    return {
      ok: false as const,
      response: errorResponse(
        403,
        "APPLICATION_USER_REQUIRED",
        "Tài khoản chưa sẵn sàng để xem thông báo.",
      ),
    };
  }

  return {
    ok: true as const,
    applicationUser,
  };
}

export async function GET(): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const userId =
    authorization.applicationUser.id;

  try {
    const [
      unreadCount,
      notifications,
    ] = await Promise.all([
      prisma.travelNotification.count({
        where: {
          userId,
          readAt: null,
          post: {
            status: "PUBLISHED",
            deletedAt: null,
          },
        },
      }),
      prisma.travelNotification.findMany({
        where: {
          userId,
          post: {
            status: "PUBLISHED",
            deletedAt: null,
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: MAX_NOTIFICATIONS,
        select: {
          id: true,
          type: true,
          reactionType: true,
          commentPreview: true,
          readAt: true,
          createdAt: true,
          actor: {
            select: {
              profile: {
                select: {
                  displayName: true,
                  fullName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      unreadCount,
      notifications:
        notifications.map(
          (notification) => ({
            id: notification.id,
            type: notification.type,
            reactionType:
              notification.reactionType,
            commentPreview:
              notification.commentPreview,
            readAt:
              notification.readAt,
            createdAt:
              notification.createdAt,
            actorName:
              notification.actor.profile
                ?.displayName ??
              notification.actor.profile
                ?.fullName ??
              "Người dùng VTripPlanner",
          }),
        ),
    });
  } catch (error) {
    console.error(
      "Social notifications read failed:",
      error,
    );

    return errorResponse(
      500,
      "NOTIFICATIONS_READ_FAILED",
      "Không thể tải thông báo. Vui lòng thử lại.",
    );
  }
}

export async function PATCH(): Promise<NextResponse> {
  const authorization =
    await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const userId =
    authorization.applicationUser.id;

  try {
    const result =
      await prisma.travelNotification.updateMany({
        where: {
          userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

    return NextResponse.json({
      ok: true,
      markedReadCount: result.count,
    });
  } catch (error) {
    console.error(
      "Social notifications mark-read failed:",
      error,
    );

    return errorResponse(
      500,
      "NOTIFICATIONS_MARK_READ_FAILED",
      "Không thể đánh dấu thông báo đã đọc.",
    );
  }
}
