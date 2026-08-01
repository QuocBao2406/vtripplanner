import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await prisma.$queryRaw<Array<{ value: number }>>`
      SELECT 1 AS value
    `;

    const connected = result[0]?.value === 1;

    return NextResponse.json(
      {
        status: connected ? "ok" : "error",
        database: connected ? "connected" : "unexpected_response",
      },
      {
        status: connected ? 200 : 503,
      },
    );
  } catch (error) {
    console.error("Database health check failed.", error);

    return NextResponse.json(
      {
        status: "error",
        database: "unavailable",
      },
      {
        status: 503,
      },
    );
  }
}
