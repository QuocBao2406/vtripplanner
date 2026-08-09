import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AppRole } from "@/generated/prisma/enums";
import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
import { prisma } from "@/lib/prisma";

const updateUserStatusSchema = z.object({
  userId: z
    .string()
    .uuid("ID người dùng không hợp lệ."),
  isActive: z.boolean(),
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
    updateUserStatusSchema.safeParse(
      await parseJson(request),
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]
            ?.message ??
          "Dữ liệu trạng thái tài khoản không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    parsed.data.userId ===
    access.userId
  ) {
    return NextResponse.json(
      {
        message:
          "Không thể tự thay đổi trạng thái tài khoản ADMIN đang đăng nhập.",
      },
      {
        status: 409,
      },
    );
  }

  const targetUser =
    await prisma.user.findUnique({
      where: {
        id: parsed.data.userId,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        deletedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

  if (!targetUser) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy tài khoản.",
      },
      {
        status: 404,
      },
    );
  }

  if (targetUser.deletedAt) {
    return NextResponse.json(
      {
        message:
          "Tài khoản đã xóa mềm. Màn hình này không khôi phục tài khoản đã xóa.",
      },
      {
        status: 409,
      },
    );
  }

  const activeRoles =
    targetUser.userRoles
      .filter(
        (item) =>
          item.role.isActive,
      )
      .map(
        (item) => item.role.name,
      );

  if (
    activeRoles.includes(
      AppRole.ADMIN,
    )
  ) {
    return NextResponse.json(
      {
        message:
          "Tài khoản ADMIN được bảo vệ và không thể khóa/mở tại màn hình quản lý người dùng.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    targetUser.isActive ===
    parsed.data.isActive
  ) {
    return NextResponse.json({
      message:
        parsed.data.isActive
          ? "Tài khoản đã ở trạng thái hoạt động."
          : "Tài khoản đã ở trạng thái vô hiệu hóa.",
      user: {
        id: targetUser.id,
        isActive:
          targetUser.isActive,
      },
    });
  }

  try {
    const updatedUser =
      await prisma.$transaction(
        async (transaction) => {
          const updated =
            await transaction.user.update({
              where: {
                id: targetUser.id,
              },
              data: {
                isActive:
                  parsed.data.isActive,
              },
              select: {
                id: true,
                email: true,
                isActive: true,
                updatedAt: true,
              },
            });

          await transaction.auditLog.create({
            data: {
              actorUserId:
                access.userId,
              action:
                parsed.data.isActive
                  ? "ADMIN_USER_REACTIVATE"
                  : "ADMIN_USER_DEACTIVATE",
              entityType: "User",
              entityId:
                targetUser.id,
              metadata: {
                email:
                  targetUser.email,
                previousIsActive:
                  targetUser.isActive,
                nextIsActive:
                  parsed.data.isActive,
                roles: activeRoles,
              },
            },
          });

          return updated;
        },
      );

    revalidatePath("/");
    revalidatePath("/quan-tri");
    revalidatePath(
      "/quan-tri/nguoi-dung",
    );
    revalidatePath("/tai-khoan");

    return NextResponse.json({
      message:
        updatedUser.isActive
          ? "Đã kích hoạt lại tài khoản."
          : "Đã vô hiệu hóa tài khoản.",
      user: {
        id: updatedUser.id,
        isActive:
          updatedUser.isActive,
        updatedAt:
          updatedUser.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
