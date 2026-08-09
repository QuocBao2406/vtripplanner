import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  buildInternalTripDraftOptions,
  isValidInternalTripDuration,
  parseInternalTripStartDate,
} from "@/lib/trip-planner/internal-plan";
import {
  isTripTransportMode,
  parseVietnamTripDeparture,
} from "@/lib/trip-planner/travel-estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_TRAVELER_COUNT = 1;
const MAX_TRAVELER_COUNT = 20;
const MIN_TOTAL_BUDGET = 100000;
const MAX_TOTAL_BUDGET = 1000000000;
const MAX_ORIGIN_LENGTH = 150;
const MAX_DESTINATION_LENGTH = 100;
const MAX_INTERESTS = 5;
const MAX_INTEREST_LENGTH = 80;

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

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Không thể đọc dữ liệu draft.",
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return errorResponse(
      400,
      "INVALID_DRAFT_OPTIONS_REQUEST",
      "Dữ liệu lấy địa điểm thay thế không hợp lệ.",
    );
  }

  const record = payload as Record<string, unknown>;
  const origin = readString(record.origin);
  const destination = readString(record.destination);
  const startDate = readString(record.startDate);
  const departureTime = readString(record.departureTime);
  const transportMode = readString(
    record.transportMode,
  ).toUpperCase();
  const duration = Number(record.duration);
  const travelerCount = Number(record.travelerCount);
  const totalBudget = Number(record.totalBudget);
  const interests = Array.isArray(record.interests)
    ? [
        ...new Set(
          record.interests
            .filter(
              (value): value is string =>
                typeof value === "string",
            )
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ]
    : [];

  if (
    origin.length < 2 ||
    origin.length > MAX_ORIGIN_LENGTH ||
    destination.length < 2 ||
    destination.length > MAX_DESTINATION_LENGTH ||
    !parseInternalTripStartDate(startDate) ||
    !parseVietnamTripDeparture(startDate, departureTime) ||
    !isTripTransportMode(transportMode) ||
    !isValidInternalTripDuration(duration) ||
    !Number.isInteger(travelerCount) ||
    travelerCount < MIN_TRAVELER_COUNT ||
    travelerCount > MAX_TRAVELER_COUNT ||
    !Number.isFinite(totalBudget) ||
    totalBudget < MIN_TOTAL_BUDGET ||
    totalBudget > MAX_TOTAL_BUDGET ||
    interests.length > MAX_INTERESTS ||
    interests.some(
      (interest) => interest.length > MAX_INTEREST_LENGTH,
    )
  ) {
    return errorResponse(
      400,
      "INVALID_DRAFT_OPTIONS_REQUEST",
      "Thông tin chuyến đi không còn hợp lệ. Hãy quay lại tạo lịch trình mới.",
    );
  }

  try {
    const currentUser = await getCurrentUser();
    const result = await buildInternalTripDraftOptions(
      {
        origin,
        destination,
        startDate,
        departureTime,
        transportMode,
        duration,
        travelerCount,
        totalBudget,
        interests,
      },
      currentUser?.id ?? null,
    );

    if (result.options.length === 0) {
      return errorResponse(
        422,
        "NO_DRAFT_OPTIONS",
        "Không còn địa điểm phù hợp để chỉnh draft cho điểm đến này.",
      );
    }

    return NextResponse.json({
      ok: true,
      options: result.options,
    });
  } catch (error) {
    console.error(
      "Trip draft options failed:",
      error,
    );

    return errorResponse(
      500,
      "DRAFT_OPTIONS_FAILED",
      "Không thể tải địa điểm thay thế lúc này.",
    );
  }
}
