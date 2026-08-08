import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_FUTURE_SNAPSHOT_MS =
  5 * 60 * 1000;

function isValidMonth(
  value: number,
): boolean {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}

function parseSnapshotAt(
  value: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const milliseconds =
    Date.parse(value);

  if (
    Number.isNaN(milliseconds) ||
    milliseconds >
      Date.now() +
        MAX_FUTURE_SNAPSHOT_MS
  ) {
    return null;
  }

  return new Date(milliseconds);
}

export async function GET(
  request: Request,
) {
  const url = new URL(request.url);
  const month = Number(
    url.searchParams.get("month"),
  );
  const snapshotAt =
    parseSnapshotAt(
      url.searchParams.get(
        "snapshotAt",
      ),
    );

  if (
    !isValidMonth(month) ||
    !snapshotAt
  ) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "INVALID_FEED_SNAPSHOT",
        message:
          "Snapshot hoặc tháng của feed không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const currentUser =
      await getCurrentUser();
    const newPost =
      await prisma.travelPost.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          ...(currentUser
            ? {
                hides: {
                  none: {
                    userId:
                      currentUser.id,
                  },
                },
              }
            : {}),
          createdAt: {
            gt: snapshotAt,
          },
          OR: [
            {
              seasonMonths: {
                isEmpty: true,
              },
            },
            {
              seasonMonths: {
                has: month,
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
        select: {
          id: true,
        },
      });

    return NextResponse.json(
      {
        ok: true,
        hasNewPosts:
          newPost !== null,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/social/feed/updates failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        code:
          "FEED_UPDATE_CHECK_FAILED",
        message:
          "Chưa thể kiểm tra bài viết mới.",
      },
      {
        status: 500,
      },
    );
  }
}
