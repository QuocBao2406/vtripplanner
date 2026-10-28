import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { TravelPostStatus } from "@/generated/prisma/enums";
import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
import { prisma } from "@/lib/prisma";

const moderationSchema = z.object({
  postId: z.string().uuid("ID bài viết không hợp lệ."),
  action: z.enum(["HIDE", "UNHIDE", "DELETE", "RESTORE"]),
  reason: z
    .string()
    .trim()
    .max(500, "Lý do moderation tối đa 500 ký tự.")
    .optional(),
});

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function revalidateSocialPaths() {
  revalidatePath("/");
  revalidatePath("/bai-viet-cua-toi");
  revalidatePath("/bai-viet-da-luu");
  revalidatePath("/quan-tri");
  revalidatePath("/quan-tri/bai-viet");
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const access = await getAdminApiAccess();

  if (!access.ok) {
    return NextResponse.json(
      { message: access.message },
      { status: access.status },
    );
  }

  const parsed = moderationSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Dữ liệu moderation không hợp lệ.",
      },
      { status: 400 },
    );
  }

  const { action, postId } = parsed.data;
  const reason = parsed.data.reason?.trim() ?? "";

  if (action === "DELETE" && reason.length < 5) {
    return NextResponse.json(
      { message: "Vui lòng nhập lý do xóa bài ít nhất 5 ký tự." },
      { status: 400 },
    );
  }

  const post = await prisma.travelPost.findUnique({
    where: { id: postId },
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
      { message: "Không tìm thấy bài viết." },
      { status: 404 },
    );
  }

  let auditAction = "";
  let successMessage = "";
  let dataUpdate: { status?: TravelPostStatus; deletedAt?: Date | null } = {};
  let whereClause: { id: string; [key: string]: unknown } = { id: post.id };

  if (action === "HIDE") {
    if (post.deletedAt) {
      return NextResponse.json(
        { message: "Bài viết đã bị xóa, không thể thực hiện ẩn/hiện." },
        { status: 409 },
      );
    }
    if (post.status !== TravelPostStatus.PUBLISHED) {
      return NextResponse.json(
        { message: "Chỉ có thể ẩn bài viết đang ở trạng thái hiển thị (PUBLISHED)." },
        { status: 409 },
      );
    }
    auditAction = "ADMIN_SOCIAL_POST_HIDE";
    successMessage = "Đã ẩn bài viết khỏi bảng tin công khai.";
    dataUpdate = { status: TravelPostStatus.HIDDEN };
    whereClause = { id: post.id, status: TravelPostStatus.PUBLISHED, deletedAt: null };
  } else if (action === "UNHIDE") {
    if (post.deletedAt) {
      return NextResponse.json(
        { message: "Bài viết đã bị xóa, vui lòng khôi phục trước." },
        { status: 409 },
      );
    }
    if (post.status !== TravelPostStatus.HIDDEN) {
      return NextResponse.json(
        { message: "Chỉ có thể bỏ ẩn bài viết đang ở trạng thái ẩn (HIDDEN)." },
        { status: 409 },
      );
    }
    auditAction = "ADMIN_SOCIAL_POST_UNHIDE";
    successMessage = "Đã bỏ ẩn và hiển thị lại bài viết trên bảng tin.";
    dataUpdate = { status: TravelPostStatus.PUBLISHED };
    whereClause = { id: post.id, status: TravelPostStatus.HIDDEN, deletedAt: null };
  } else if (action === "DELETE") {
    if (post.deletedAt) {
      return NextResponse.json(
        { message: "Bài viết này đã được xóa trước đó." },
        { status: 409 },
      );
    }
    auditAction = "ADMIN_SOCIAL_POST_DELETE";
    successMessage = "Đã xóa bài viết khỏi hệ thống.";
    dataUpdate = { deletedAt: new Date() };
    whereClause = { id: post.id, deletedAt: null };
  } else if (action === "RESTORE") {
    if (post.deletedAt) {
      auditAction = "ADMIN_SOCIAL_POST_RESTORE";
      successMessage = "Đã khôi phục bài viết đã xóa thành công.";
      dataUpdate = { deletedAt: null, status: TravelPostStatus.PUBLISHED };
      whereClause = { id: post.id };
    } else if (post.status === TravelPostStatus.HIDDEN) {
      auditAction = "ADMIN_SOCIAL_POST_UNHIDE";
      successMessage = "Đã bỏ ẩn và khôi phục hiển thị bài viết.";
      dataUpdate = { status: TravelPostStatus.PUBLISHED };
      whereClause = { id: post.id, status: TravelPostStatus.HIDDEN, deletedAt: null };
    } else {
      return NextResponse.json(
        { message: "Bài viết đang ở trạng thái bình thường, không cần khôi phục." },
        { status: 409 },
      );
    }
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.travelPost.updateMany({
        where: whereClause,
        data: dataUpdate,
      });

      if (updateResult.count !== 1) {
        throw new Error("POST_STATE_CHANGED");
      }

      if (action === "DELETE") {
        await transaction.travelNotification.deleteMany({
          where: { postId: post.id },
        });
      }

      await transaction.auditLog.create({
        data: {
          actorUserId: access.userId,
          action: auditAction,
          entityType: "TravelPost",
          entityId: post.id,
          metadata: {
            reason: reason || null,
            actionTaken: action,
            previousStatus: post.status,
            previousDeletedAt: post.deletedAt ? post.deletedAt.toISOString() : null,
            headline: post.headline,
            authorUserId: post.authorUserId,
            captionPreview: post.caption?.slice(0, 180) ?? null,
            notificationsRemoved: action === "DELETE",
          },
        },
      });
    });

    revalidateSocialPaths();

    return NextResponse.json({
      message: successMessage,
      post: {
        id: post.id,
        ...dataUpdate,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "POST_STATE_CHANGED"
    ) {
      return NextResponse.json(
        { message: "Trạng thái bài viết vừa thay đổi. Vui lòng tải lại trang và thử lại." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Không thể xử lý bài viết. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
