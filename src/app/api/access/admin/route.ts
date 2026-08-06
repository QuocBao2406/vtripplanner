import { NextResponse } from "next/server";

import { AppRole } from "@/generated/prisma/enums";
import { authorizeApi } from "@/lib/auth/authorization";

export async function GET() {
  const authorization = await authorizeApi([AppRole.ADMIN]);

  if (!authorization.ok) {
    return authorization.response;
  }

  return NextResponse.json({
    authorized: true,
    area: "admin",
    roles: authorization.access.roles,
  });
}