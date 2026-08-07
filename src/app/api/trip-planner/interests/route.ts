import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { getReactionInterestSignals } from "@/lib/trip-planner/reaction-interest-signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  status: number,
  error: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
    },
    { status },
  );
}

export async function GET(): Promise<NextResponse> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return errorResponse(
      401,
      "AUTH_REQUIRED",
      "Vui lòng đăng nhập để sử dụng sở thích cá nhân hóa.",
    );
  }

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
    select: {
      id: true,
    },
  });

  if (!applicationUser) {
    return errorResponse(
      403,
      "APPLICATION_USER_REQUIRED",
      "Tài khoản chưa sẵn sàng để cá nhân hóa lịch trình.",
    );
  }

  try {
    const signals = await getReactionInterestSignals(
      applicationUser.id,
    );

    return NextResponse.json({
      ok: true,
      signals,
    });
  } catch (error) {
    console.error(
      "Trip planner reaction interest read failed:",
      error,
    );

    return errorResponse(
      500,
      "REACTION_INTEREST_READ_FAILED",
      "Không thể đọc tín hiệu sở thích. Vui lòng thử lại.",
    );
  }
}
