import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PlaceVerificationStatus, PromotionStatus } from "@/generated/prisma/enums";
import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
import { prisma } from "@/lib/prisma";

const input = z.object({
  promotionId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().max(1000).optional().default(""),
}).refine((v) => v.decision === "APPROVE" || v.rejectionReason.trim().length >= 5, {
  message: "Lý do từ chối cần ít nhất 5 ký tự.", path: ["rejectionReason"],
});

export async function PATCH(request: Request) {
  const access = await getAdminApiAccess();
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

  let raw: unknown;
  try { raw = await request.json(); } catch { raw = null; }
  const parsed = input.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });

  const promotion = await prisma.promotion.findFirst({
    where: { id: parsed.data.promotionId, deletedAt: null },
    select: {
      id: true, partnerId: true, title: true, status: true, endAt: true,
      places: { select: { place: { select: { partnerId: true, verificationStatus: true, isActive: true, deletedAt: true } } } },
    },
  });
  if (!promotion) return NextResponse.json({ message: "Không tìm thấy chương trình." }, { status: 404 });
  if (promotion.status !== PromotionStatus.PENDING) return NextResponse.json({ message: "Chỉ chương trình PENDING mới được xét duyệt." }, { status: 409 });

  const approve = parsed.data.decision === "APPROVE";
  if (approve && promotion.endAt <= new Date()) return NextResponse.json({ message: "Chương trình đã hết thời gian áp dụng." }, { status: 409 });
  if (approve && promotion.places.some(({ place }) => place.partnerId !== promotion.partnerId || place.verificationStatus !== PlaceVerificationStatus.VERIFIED || !place.isActive || place.deletedAt)) {
    return NextResponse.json({ message: "Một hoặc nhiều Place áp dụng không còn hợp lệ." }, { status: 409 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.promotion.update({
        where: { id: promotion.id },
        data: {
          status: approve ? PromotionStatus.APPROVED : PromotionStatus.REJECTED,
          rejectionReason: approve ? null : parsed.data.rejectionReason.trim(),
          reviewedByUserId: access.userId, reviewedAt: new Date(), isActive: approve,
        },
        select: { id: true, status: true, isActive: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: access.userId,
          action: approve ? "ADMIN_PROMOTION_APPROVE" : "ADMIN_PROMOTION_REJECT",
          entityType: "Promotion", entityId: promotion.id,
          metadata: { partnerId: promotion.partnerId, title: promotion.title, decision: parsed.data.decision, rejectionReason: approve ? null : parsed.data.rejectionReason.trim() },
        },
      });
      return result;
    });
    revalidatePath("/doi-tac/uu-dai"); revalidatePath("/quan-tri/uu-dai"); revalidatePath("/quan-tri");
    return NextResponse.json({ message: approve ? "Đã phê duyệt chương trình." : "Đã từ chối chương trình.", promotion: updated });
  } catch {
    return NextResponse.json({ message: "Không thể xét duyệt chương trình." }, { status: 500 });
  }
}
