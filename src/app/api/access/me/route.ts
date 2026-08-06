import { NextResponse } from "next/server";

import { authorizeApi } from "@/lib/auth/authorization";

export async function GET() {
  const authorization = await authorizeApi();

  if (!authorization.ok) {
    return authorization.response;
  }

  return NextResponse.json({
    authenticated: true,
    applicationUserId: authorization.access.applicationUserId,
    roles: authorization.access.roles,
  });
}