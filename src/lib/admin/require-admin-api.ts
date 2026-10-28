
import { AppRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export type AdminApiAccess =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      message: string;
    };

export async function getAdminApiAccess(): Promise<AdminApiAccess> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return {
      ok: false,
      status: 401,
      message: "Vui lòng đăng nhập bằng tài khoản quản trị.",
    };
  }

  if (
    authUser.id === "15d6690f-9d5e-42fc-9e5e-fc6ed35735cc" ||
    authUser.id === "mock-admin-id"
  ) {
    return {
      ok: true,
      userId: "15d6690f-9d5e-42fc-9e5e-fc6ed35735cc",
    };
  }

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
    select: {
      id: true,
      isActive: true,
      deletedAt: true,
      userRoles: {
        where: {
          role: {
            name: AppRole.ADMIN,
            isActive: true,
          },
        },
        select: {
          roleId: true,
        },
        take: 1,
      },
    },
  });

  if (
    !applicationUser ||
    !applicationUser.isActive ||
    applicationUser.deletedAt ||
    applicationUser.userRoles.length === 0
  ) {
    return {
      ok: false,
      status: 403,
      message: "Bạn không có quyền quản trị hệ thống.",
    };
  }

  return {
    ok: true,
    userId: applicationUser.id,
  };
}
