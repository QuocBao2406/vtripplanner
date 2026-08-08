
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PlaceVerificationStatus } from "@/generated/prisma/enums";
import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
import { prisma } from "@/lib/prisma";

const reviewSchema = z
  .object({
    placeId: z.string().uuid("ID địa điểm không hợp lệ."),
    decision: z.enum(["APPROVE", "REJECT"]),
    rejectionReason: z.string().max(1000).optional().default(""),
  })
  .refine(
    (value) =>
      value.decision === "APPROVE" ||
      value.rejectionReason.trim().length >= 5,
    {
      message: "Lý do từ chối cần ít nhất 5 ký tự.",
      path: ["rejectionReason"],
    },
  );

export async function PATCH(request: Request): Promise<NextResponse> {
  const access = await getAdminApiAccess();

  if (!access.ok) {
    return NextResponse.json(
      {
        message: access.message,
      },
      {
        status: access.status,
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "Dữ liệu xét duyệt không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Thông tin xét duyệt không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const place = await prisma.place.findFirst({
    where: {
      id: parsed.data.placeId,
      partnerId: {
        not: null,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      partnerId: true,
      name: true,
      verificationStatus: true,
    },
  });

  if (!place) {
    return NextResponse.json(
      {
        message: "Không tìm thấy địa điểm do Partner gửi.",
      },
      {
        status: 404,
      },
    );
  }

  if (place.verificationStatus !== PlaceVerificationStatus.PENDING) {
    return NextResponse.json(
      {
        message: "Chỉ địa điểm PENDING mới được xét duyệt.",
      },
      {
        status: 409,
      },
    );
  }

  const approved = parsed.data.decision === "APPROVE";
  const now = new Date();

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.place.update({
        where: {
          id: place.id,
        },
        data: {
          verificationStatus: approved
            ? PlaceVerificationStatus.VERIFIED
            : PlaceVerificationStatus.REJECTED,
          rejectionReason: approved
            ? null
            : parsed.data.rejectionReason.trim(),
          reviewedByUserId: access.userId,
          reviewedAt: now,
          isActive: approved,
        },
        select: {
          id: true,
          name: true,
          verificationStatus: true,
          isActive: true,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId: access.userId,
          action: approved
            ? "ADMIN_PARTNER_PLACE_APPROVE"
            : "ADMIN_PARTNER_PLACE_REJECT",
          entityType: "Place",
          entityId: place.id,
          metadata: {
            partnerId: place.partnerId,
            name: place.name,
            decision: parsed.data.decision,
            rejectionReason: approved
              ? null
              : parsed.data.rejectionReason.trim(),
          },
        },
      });

      return result;
    });

    revalidatePath("/");
    revalidatePath("/dia-diem");
    revalidatePath("/doi-tac");
    revalidatePath("/doi-tac/dia-diem");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json({
      message: approved
        ? "Đã phê duyệt địa điểm Partner. Địa điểm hiện VERIFIED và hoạt động."
        : "Đã từ chối địa điểm Partner và lưu lý do.",
      place: updated,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể xét duyệt địa điểm Partner.",
      },
      {
        status: 500,
      },
    );
  }
}
