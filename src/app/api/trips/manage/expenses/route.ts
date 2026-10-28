import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { TripExpenseCategory, TripExpenseScope, TripExpenseSource } from "@/generated/prisma/enums";

export const runtime = "nodejs";

function errorResponse(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return errorResponse(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để ghi nhận chi phí.");
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.");
  }

  const {
    tripId,
    title,
    category,
    actualAmount,
    estimatedAmount,
    occurredAt,
    note,
    plannedBudget,
  } = body;

  if (!tripId) {
    return errorResponse(400, "TRIP_ID_REQUIRED", "Thiếu tripId.");
  }

  // Check ownership
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ownerUserId: authUser.id, deletedAt: null },
  });

  if (!trip) {
    return errorResponse(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi.");
  }

  try {
    // If budget update was requested
    if (typeof plannedBudget === "number" && plannedBudget >= 0) {
      await prisma.tripBudget.upsert({
        where: { tripId },
        create: {
          tripId,
          plannedAmount: plannedBudget,
          currency: trip.currency || "VND",
        },
        update: {
          plannedAmount: plannedBudget,
        },
      });

      // Also sync trip.totalBudget
      await prisma.trip.update({
        where: { id: tripId },
        data: { totalBudget: plannedBudget },
      });
    }

    // If an expense item is submitted
    if (title && typeof actualAmount === "number") {
      const validCategory: TripExpenseCategory =
        category && TripExpenseCategory[category as keyof typeof TripExpenseCategory]
          ? (category as TripExpenseCategory)
          : TripExpenseCategory.OTHER;

      const newExpense = await prisma.tripExpense.create({
        data: {
          tripId,
          title: title.trim(),
          category: validCategory,
          scope: TripExpenseScope.SHARED,
          source: TripExpenseSource.USER,
          actualAmount,
          estimatedAmount: estimatedAmount ?? null,
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
          note: note?.trim() || null,
        },
      });

      return NextResponse.json({ ok: true, expense: newExpense });
    }

    return NextResponse.json({ ok: true, message: "Đã cập nhật ngân sách chuyến đi." });
  } catch (error) {
    console.error("Expense operation failed:", error);
    return errorResponse(500, "EXPENSE_FAILED", "Không thể ghi nhận chi phí.");
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return errorResponse(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để xóa khoản chi.");
  }

  let expenseId: string | null = null;
  const url = new URL(request.url);
  expenseId = url.searchParams.get("expenseId");

  if (!expenseId) {
    try {
      const body = await request.json();
      expenseId = body.expenseId;
    } catch {
      // Ignored
    }
  }

  if (!expenseId) {
    return errorResponse(400, "EXPENSE_ID_REQUIRED", "Thiếu expenseId.");
  }

  try {
    const expense = await prisma.tripExpense.findUnique({
      where: { id: expenseId },
      include: { trip: true },
    });

    if (!expense || expense.trip.ownerUserId !== authUser.id) {
      return errorResponse(404, "EXPENSE_NOT_FOUND", "Không tìm thấy khoản chi thuộc chuyến đi của bạn.");
    }

    await prisma.tripExpense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({ ok: true, expenseId });
  } catch (error) {
    console.error("Delete expense failed:", error);
    return errorResponse(500, "EXPENSE_DELETE_FAILED", "Không thể xóa khoản chi.");
  }
}
