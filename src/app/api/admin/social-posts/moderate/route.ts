import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  TravelPostStatus,
  TravelPostType,
} from "@/generated/prisma/enums";
import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
import { prisma } from "@/lib/prisma";

const moderationSchema = z.object({
  postId: z
    .string()
    .uuid("ID bài viết không hợp lệ."),
  action: z.enum([
    "DELETE",
    "RESTORE",
  ]),
  reason: z
    .string()
    .trim()
    .max(
      500,
      "Lý do moderation tối đa 500 ký tự.",
    )
    .optional(),
});

async function parseJson(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function revalidateSocialPaths() {
  revalidatePath("/");
  revalidatePath(
    "/bai-viet-cua-toi",
  );
  revalidatePath(
    "/bai-viet-da-luu",
  );
  revalidatePath("/quan-tri");
  revalidatePath(
    "/quan-tri/bai-viet",
  );
}

export async function PATCH(
  request: Request,
): Promise<NextResponse> {
  const access =
    await getAdminApiAccess();

  if (!access.ok) {
    return NextResponse.json(
      {
        message: access.message,
      },
      {
        status: access.status,
      },
    );
  }

  const parsed =
    moderationSchema.safeParse(
      await parseJson(request),
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]
            ?.message ??
          "Dữ liệu moderation không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const reason =
    parsed.data.reason?.trim() ??
    "";

  if (
    parsed.data.action === "DELETE" &&
    reason.length < 5
  ) {
    return NextResponse.json(
      {
        message:
          "Vui lòng nhập lý do xóa bài ít nhất 5 ký tự.",
      },
      {
        status: 400,
      },
    );
  }

  const post =
    await prisma.travelPost.findUnique({
      where: {
        id: parsed.data.postId,
      },
      select: {
        id: true,
        authorUserId: true,
        type: true,
        status: true,
        headline: true,
        caption: true,
        deletedAt: true,
      },
    });

  if (!post) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy bài viết.",
      },
      {
        status: 404,
      },
    );
  }

  if (
    post.type !==
    TravelPostType.USER_TRIP
  ) {
    return NextResponse.json(
      {
        message:
          "7.16Q chỉ moderation bài USER_TRIP. Bài hệ thống là chế độ chỉ xem.",
      },
      {
        status: 409,
      },
    );
  }

  if (post.deletedAt) {
    return NextResponse.json(
      {
        message:
          "Bài viết đã được chính user xóa. ADMIN không thể khôi phục hoặc thay đổi trạng thái xóa của user.",
      },
      {
        status: 409,
      },
    );
  }

  const isDelete =
    parsed.data.action === "DELETE";
  const expectedStatus = isDelete
    ? TravelPostStatus.PUBLISHED
    : TravelPostStatus.HIDDEN;
  const nextStatus = isDelete
    ? TravelPostStatus.HIDDEN
    : TravelPostStatus.PUBLISHED;

  if (post.status !== expectedStatus) {
    return NextResponse.json(
      {
        message: isDelete
          ? "Chỉ có thể xóa moderation bài USER_TRIP đang PUBLISHED."
          : "Chỉ có thể khôi phục bài USER_TRIP đang bị ADMIN ẩn.",
      },
      {
        status: 409,
      },
    );
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const updateResult =
          await transaction.travelPost.updateMany({
            where: {
              id: post.id,
              type:
                TravelPostType.USER_TRIP,
              status:
                expectedStatus,
              deletedAt: null,
            },
            data: {
              status: nextStatus,
            },
          });

        if (
          updateResult.count !== 1
        ) {
          throw new Error(
            "POST_STATE_CHANGED",
          );
        }

        if (isDelete) {
          await transaction.travelNotification.deleteMany({
            where: {
              postId: post.id,
            },
          });
        }

        await transaction.auditLog.create({
          data: {
            actorUserId:
              access.userId,
            action: isDelete
              ? "ADMIN_SOCIAL_POST_DELETE"
              : "ADMIN_SOCIAL_POST_RESTORE",
            entityType:
              "TravelPost",
            entityId: post.id,
            metadata: {
              reason:
                reason || null,
              previousStatus:
                expectedStatus,
              nextStatus,
              authorUserId:
                post.authorUserId,
              headline:
                post.headline,
              captionPreview:
                post.caption?.slice(
                  0,
                  180,
                ) ?? null,
              notificationsRemoved:
                isDelete,
            },
          },
        });
      },
    );

    revalidateSocialPaths();

    return NextResponse.json({
      message: isDelete
        ? "Đã xóa bài viết khỏi toàn bộ khu vực hiển thị công khai."
        : "Đã khôi phục bài viết về trạng thái PUBLISHED.",
      post: {
        id: post.id,
        status: nextStatus,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "POST_STATE_CHANGED"
    ) {
      return NextResponse.json(
        {
          message:
            "Trạng thái bài viết vừa thay đổi. Vui lòng tải lại trang và thử lại.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          "Không thể moderation bài viết. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
