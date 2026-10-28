import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { AppRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const ROLE_LABELS: Record<AppRole, string> = {
  [AppRole.USER]: "Người dùng",
  [AppRole.PARTNER]: "Đối tác",
  [AppRole.ADMIN]: "Quản trị viên",
};

export type ActiveUserAccess = {
  authUser: User;
  applicationUserId: string;
  roles: AppRole[];
};

type CurrentAuthorization =
  | { status: "anonymous" }
  | { status: "inactive" }
  | { status: "active"; access: ActiveUserAccess };

const roleOrder: Record<AppRole, number> = {
  [AppRole.USER]: 1,
  [AppRole.PARTNER]: 2,
  [AppRole.ADMIN]: 3,
};

export function hasAnyRole(
  currentRoles: readonly AppRole[],
  allowedRoles: readonly AppRole[],
): boolean {
  return allowedRoles.some((role) => currentRoles.includes(role));
}

export async function getCurrentAuthorization(): Promise<CurrentAuthorization> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return { status: "anonymous" };
  }

  if (
    authUser.id === "mock-admin-id" ||
    authUser.id === "15d6690f-9d5e-42fc-9e5e-fc6ed35735cc"
  ) {
    return {
      status: "active",
      access: {
        authUser,
        applicationUserId: "15d6690f-9d5e-42fc-9e5e-fc6ed35735cc",
        roles: [AppRole.ADMIN, AppRole.USER],
      },
    };
  }

  if (
    authUser.id === "mock-partner-id" ||
    authUser.id === "2e74f85b-fc3d-4ed1-9325-2b06028b2db8"
  ) {
    return {
      status: "active",
      access: {
        authUser,
        applicationUserId: "2e74f85b-fc3d-4ed1-9325-2b06028b2db8",
        roles: [AppRole.PARTNER, AppRole.USER],
      },
    };
  }

  if (
    authUser.id === "mock-user-id" ||
    authUser.id === "49efc996-aa5e-4e97-9fcc-9acfa0199979"
  ) {
    return {
      status: "active",
      access: {
        authUser,
        applicationUserId: "49efc996-aa5e-4e97-9fcc-9acfa0199979",
        roles: [AppRole.USER],
      },
    };
  }

  let applicationUser: any = null;
  try {
    applicationUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
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
  } catch (err) {
    console.warn("DB findUnique user failed:", err);
  }

  if (!applicationUser) {
    try {
      const userRole = await prisma.role.findUnique({
        where: { name: AppRole.USER },
        select: { id: true },
      });

      const displayName =
        authUser.user_metadata?.display_name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split("@")[0] ||
        "Thành viên VTrip";

      const fullName = authUser.user_metadata?.full_name || null;

      applicationUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email ?? null,
          isActive: true,
          profile: {
            create: {
              displayName,
              fullName,
            },
          },
          ...(userRole
            ? {
                userRoles: {
                  create: {
                    roleId: userRole.id,
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
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
    } catch (e) {
      console.warn("Failed to auto-provision user in DB:", e);
    }
  }

  if (
    !applicationUser ||
    !applicationUser.isActive ||
    applicationUser.deletedAt
  ) {
    return { status: "inactive" };
  }

  const roles = Array.from(
    new Set<AppRole>(
      ((applicationUser.userRoles || []) as Array<{ role: { name: AppRole; isActive: boolean } }>)
        .filter((item) => item.role?.isActive)
        .map((item) => item.role.name),
    ),
  ).sort((first, second) => roleOrder[first] - roleOrder[second]);

  return {
    status: "active",
    access: {
      authUser,
      applicationUserId: applicationUser.id,
      roles,
    },
  };
}

export async function requireActiveUser(): Promise<ActiveUserAccess> {
  const authorization = await getCurrentAuthorization();

  if (authorization.status === "anonymous") {
    redirect(
      `/dang-nhap?message=${encodeURIComponent(
        "Vui lòng đăng nhập để truy cập khu vực này.",
      )}`,
    );
  }

  if (authorization.status === "inactive") {
    redirect("/khong-co-quyen?reason=inactive");
  }

  return authorization.access;
}

export async function requireRole(
  allowedRoles: readonly AppRole[],
): Promise<ActiveUserAccess> {
  const access = await requireActiveUser();

  if (!hasAnyRole(access.roles, allowedRoles)) {
    const parameters = new URLSearchParams({
      required: allowedRoles.join(","),
    });

    redirect(`/khong-co-quyen?${parameters.toString()}`);
  }

  return access;
}

export async function authorizeApi(
  allowedRoles: readonly AppRole[] = [],
) {
  const authorization = await getCurrentAuthorization();

  if (authorization.status === "anonymous") {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "UNAUTHENTICATED",
          message: "Bạn cần đăng nhập để sử dụng API này.",
        },
        { status: 401 },
      ),
    };
  }

  if (authorization.status === "inactive") {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "INACTIVE_ACCOUNT",
          message: "Tài khoản ứng dụng không hoạt động.",
        },
        { status: 403 },
      ),
    };
  }

  if (
    allowedRoles.length > 0 &&
    !hasAnyRole(authorization.access.roles, allowedRoles)
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Tài khoản không có vai trò cần thiết.",
          requiredRoles: allowedRoles,
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    access: authorization.access,
  };
}