
import Link from "next/link";

import { AppRole } from "@/generated/prisma/enums";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

import { HomeAccountMenu } from "./home-account-menu";

const loginClassName =
  "whitespace-nowrap rounded-xl border border-white/25 px-3 py-2 font-semibold text-white transition hover:bg-white/10 sm:px-4 sm:py-2.5";

const inactiveClassName =
  "whitespace-nowrap rounded-xl border border-amber-200/40 bg-amber-300/10 px-3 py-2 font-semibold text-amber-50 transition hover:bg-amber-300/20 sm:px-4 sm:py-2.5";

function getFallbackDisplayName(email: string | null | undefined): string {
  const localPart = email?.split("@")[0]?.trim();

  return localPart || "Tài khoản";
}

export async function HomeAccountNav() {
  const authorization = await getCurrentAuthorization();

  if (authorization.status === "anonymous") {
    return (
      <Link href="/dang-nhap" className={loginClassName}>
        Đăng nhập
      </Link>
    );
  }

  if (authorization.status === "inactive") {
    return (
      <Link
        href="/khong-co-quyen?reason=inactive"
        className={inactiveClassName}
      >
        Tài khoản bị khóa
      </Link>
    );
  }

  const { access } = authorization;

  const profile = await prisma.userProfile.findUnique({
    where: {
      userId: access.applicationUserId,
    },
    select: {
      displayName: true,
      fullName: true,
    },
  });

  const displayName =
    profile?.displayName?.trim() ||
    profile?.fullName?.trim() ||
    getFallbackDisplayName(access.authUser.email);

  const isAdmin = access.roles.includes(AppRole.ADMIN);
  const isPartner = access.roles.includes(AppRole.PARTNER);

  const roleLabel = isAdmin
    ? "Quản trị viên"
    : isPartner
      ? "Đối tác"
      : "Người dùng";

  return (
    <HomeAccountMenu
      displayName={displayName}
      email={access.authUser.email ?? ""}
      roleLabel={roleLabel}
      isAdmin={isAdmin}
      isPartner={isPartner}
    />
  );
}
