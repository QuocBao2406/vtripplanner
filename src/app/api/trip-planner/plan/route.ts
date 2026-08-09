import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  buildInternalTripPlan,
  isValidInternalTripDuration,
  parseInternalTripStartDate,
  type InternalTripBudget,
} from "@/lib/trip-planner/internal-plan";
import {
  isTripTransportMode,
  parseVietnamTripDeparture,
} from "@/lib/trip-planner/travel-estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_BUDGETS =
  new Set<InternalTripBudget>([
    "ECONOMY",
    "STANDARD",
    "PREMIUM",
  ]);

const MAX_ORIGIN_LENGTH = 150;
const MAX_DESTINATION_LENGTH = 100;
const MAX_INTERESTS = 5;
const MAX_INTEREST_LENGTH = 80;

function errorResponse(
  status: number,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
      ...extra,
    },
    { status },
  );
}

function readString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
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
      "Không thể đọc dữ liệu tạo lịch trình.",
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return errorResponse(
      400,
      "INVALID_PLAN_REQUEST",
      "Dữ liệu tạo lịch trình không hợp lệ.",
    );
  }

  const record =
    payload as Record<string, unknown>;

  const origin = readString(
    record.origin,
  );
  const destination = readString(
    record.destination,
  );
  const startDate = readString(
    record.startDate,
  );
  const departureTime = readString(
    record.departureTime,
  );
  const transportMode = readString(
    record.transportMode,
  ).toUpperCase();

  const duration =
    typeof record.duration === "number"
      ? record.duration
      : Number(record.duration);

  const rawBudget = readString(
    record.budget,
  ).toUpperCase();

  const budget = rawBudget as InternalTripBudget;

  const interests = Array.isArray(
    record.interests,
  )
    ? [
        ...new Set(
          record.interests
            .filter(
              (
                value,
              ): value is string =>
                typeof value === "string",
            )
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ]
    : [];

  if (
    origin.length < 2 ||
    origin.length > MAX_ORIGIN_LENGTH
  ) {
    return errorResponse(
      400,
      "INVALID_ORIGIN",
      "Điểm xuất phát cần từ 2 đến 150 ký tự.",
    );
  }

  if (
    destination.length < 2 ||
    destination.length >
      MAX_DESTINATION_LENGTH
  ) {
    return errorResponse(
      400,
      "INVALID_DESTINATION",
      "Điểm đến cần từ 2 đến 100 ký tự.",
    );
  }

  if (
    !parseInternalTripStartDate(
      startDate,
    )
  ) {
    return errorResponse(
      400,
      "INVALID_START_DATE",
      "Ngày bắt đầu không hợp lệ.",
    );
  }

  if (
    !parseVietnamTripDeparture(
      startDate,
      departureTime,
    )
  ) {
    return errorResponse(
      400,
      "INVALID_DEPARTURE_TIME",
      "Giờ khởi hành không hợp lệ.",
    );
  }

  if (!isTripTransportMode(transportMode)) {
    return errorResponse(
      400,
      "INVALID_TRANSPORT_MODE",
      "Phương tiện phải là xe máy, ô tô hoặc xe khách.",
    );
  }

  if (
    !isValidInternalTripDuration(
      duration,
    )
  ) {
    return errorResponse(
      400,
      "INVALID_DURATION",
      "Số ngày phải từ 1 đến 7.",
    );
  }

  if (!ALLOWED_BUDGETS.has(budget)) {
    return errorResponse(
      400,
      "INVALID_BUDGET",
      "Mức ngân sách không hợp lệ.",
    );
  }

  if (
    interests.length > MAX_INTERESTS ||
    interests.some(
      (interest) =>
        interest.length >
        MAX_INTEREST_LENGTH,
    )
  ) {
    return errorResponse(
      400,
      "INVALID_INTERESTS",
      "Chỉ chọn tối đa 5 sở thích hợp lệ.",
    );
  }

  try {
    const currentUser =
      await getCurrentUser();

    const result =
      await buildInternalTripPlan(
        {
          origin,
          destination,
          startDate,
          departureTime,
          transportMode,
          duration,
          budget,
          interests,
        },
        currentUser?.id ?? null,
      );

    if (!result.plan) {
      return errorResponse(
        422,
        "DESTINATION_NOT_SUPPORTED",
        "Chưa tìm thấy địa điểm phù hợp với điểm đến này trong dữ liệu hiện tại.",
        {
          availableDestinations:
            result.availableDestinations,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      plan: result.plan,
    });
  } catch (error) {
    console.error(
      "Internal trip plan generation failed:",
      error,
    );

    return errorResponse(
      500,
      "PLAN_GENERATION_FAILED",
      "Không thể tạo lịch trình lúc này. Vui lòng thử lại.",
    );
  }
}
