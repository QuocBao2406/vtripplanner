import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const provinces =
      await prisma.province.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          places: {
            where: {
              verificationStatus:
                "VERIFIED",
              isActive: true,
              deletedAt: null,
              category: {
                isActive: true,
              },
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

    const origins = provinces.map(
      (province) => ({
        id: province.id,
        name: province.name,
      }),
    );

    const destinations = provinces
      .filter(
        (province) =>
          province.places.length > 0,
      )
      .map((province) => ({
        id: province.id,
        name: province.name,
      }));

    return NextResponse.json(
      {
        ok: true,
        origins,
        destinations,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "[trip-planner/provinces] Failed to load province options",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        origins: [],
        destinations: [],
        message:
          "Không thể tải danh sách khu vực. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
