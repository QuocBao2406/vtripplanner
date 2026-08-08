
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AppRole,
  PartnerApprovalStatus,
} from "@/generated/prisma/enums";
import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
import { prisma } from "@/lib/prisma";

const reviewSchema = z
  .object({
    partnerId: z.string().uuid("ID Partner không hợp lệ."),
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

  const partner = await prisma.partner.findFirst({
    where: {
      id: parsed.data.partnerId,
      deletedAt: null,
    },
    select: {
      id: true,
      ownerUserId: true,
      name: true,
      approvalStatus: true,
    },
  });

  if (!partner) {
    return NextResponse.json(
      {
        message: "Không tìm thấy hồ sơ Partner.",
      },
      {
        status: 404,
      },
    );
  }

  if (partner.approvalStatus !== PartnerApprovalStatus.PENDING) {
    return NextResponse.json(
      {
        message:
          "Chỉ hồ sơ Partner đang PENDING mới được xét duyệt.",
      },
      {
        status: 409,
      },
    );
  }

  const partnerRole = await prisma.role.findUnique({
    where: {
      name: AppRole.PARTNER,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!partnerRole || !partnerRole.isActive) {
    return NextResponse.json(
      {
        message: "Role PARTNER chưa sẵn sàng trong hệ thống.",
      },
      {
        status: 500,
      },
    );
  }

  const approved = parsed.data.decision === "APPROVE";
  const now = new Date();

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          approvalStatus: approved
            ? PartnerApprovalStatus.APPROVED
            : PartnerApprovalStatus.REJECTED,
          rejectionReason: approved
            ? null
            : parsed.data.rejectionReason.trim(),
          reviewedByUserId: access.userId,
          reviewedAt: now,
        },
      });

      if (approved) {
        await transaction.userRole.createMany({
          data: [
            {
              userId: partner.ownerUserId,
              roleId: partnerRole.id,
            },
          ],
          skipDuplicates: true,
        });
      } else {
        await transaction.userRole.deleteMany({
          where: {
            userId: partner.ownerUserId,
            roleId: partnerRole.id,
          },
        });
      }

      await transaction.auditLog.create({
        data: {
          actorUserId: access.userId,
          action: approved
            ? "ADMIN_PARTNER_APPROVE"
            : "ADMIN_PARTNER_REJECT",
          entityType: "Partner",
          entityId: partner.id,
          metadata: {
            ownerUserId: partner.ownerUserId,
            name: partner.name,
            decision: parsed.data.decision,
            rejectionReason: approved
              ? null
              : parsed.data.rejectionReason.trim(),
          },
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/dang-ky-doi-tac");
    revalidatePath("/doi-tac");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/doi-tac");

    return NextResponse.json({
      message: approved
        ? "Đã phê duyệt hồ sơ và cấp role PARTNER."
        : "Đã từ chối hồ sơ Partner.",
      status: approved
        ? PartnerApprovalStatus.APPROVED
        : PartnerApprovalStatus.REJECTED,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể cập nhật trạng thái Partner.",
      },
      {
        status: 500,
      },
    );
  }
}
