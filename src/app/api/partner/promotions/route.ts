import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AppRole, PartnerApprovalStatus, PlaceVerificationStatus, PromotionDiscountType, PromotionStatus } from "@/generated/prisma/enums";
import { authorizeApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

const money = z.string().trim().refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Giá trị tiền không hợp lệ.");
const input = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(2000),
  terms: z.string().trim().max(3000),
  discountType: z.enum([PromotionDiscountType.PERCENT, PromotionDiscountType.FIXED_AMOUNT]),
  discountValue: money,
  maxDiscountAmount: money,
  minimumSpend: money,
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  totalQuantity: z.string().trim().refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1), "Số lượng voucher không hợp lệ."),
  placeIds: z.array(z.string().uuid()).min(1).max(30),
}).superRefine((v, ctx) => {
  const d = Number(v.discountValue);
  if (!(d > 0)) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Giá trị giảm phải lớn hơn 0." });
  if (v.discountType === PromotionDiscountType.PERCENT && d > 100) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Phần trăm không vượt quá 100." });
  if (new Date(v.endAt) <= new Date(v.startAt)) ctx.addIssue({ code: "custom", path: ["endAt"], message: "Kết thúc phải sau bắt đầu." });
});
const updateInput = input.and(z.object({ id: z.string().uuid() }));

async function body(request: Request) { try { return await request.json(); } catch { return null; } }
async function partner(userId: string) {
  return prisma.partner.findFirst({ where: { ownerUserId: userId, approvalStatus: PartnerApprovalStatus.APPROVED, deletedAt: null }, select: { id: true, name: true } });
}
async function placesOk(partnerId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  const count = await prisma.place.count({ where: { id: { in: unique }, partnerId, verificationStatus: PlaceVerificationStatus.VERIFIED, isActive: true, deletedAt: null } });
  return count === unique.length;
}
function data(v: z.infer<typeof input>) {
  return {
    title: v.title, description: v.description, terms: v.terms || null,
    discountType: v.discountType, discountValue: v.discountValue,
    maxDiscountAmount: v.discountType === PromotionDiscountType.PERCENT && v.maxDiscountAmount ? v.maxDiscountAmount : null,
    minimumSpend: v.minimumSpend || null,
    startAt: new Date(v.startAt), endAt: new Date(v.endAt),
    totalQuantity: v.totalQuantity ? Number(v.totalQuantity) : null,
  };
}

export async function POST(request: Request) {
  const auth = await authorizeApi([AppRole.PARTNER]);
  if (!auth.ok) return auth.response;
  const p = await partner(auth.access.applicationUserId);
  if (!p) return NextResponse.json({ message: "Partner chưa được phê duyệt." }, { status: 403 });
  const parsed = input.safeParse(await body(request));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  const placeIds = [...new Set(parsed.data.placeIds)];
  if (!(await placesOk(p.id, placeIds))) return NextResponse.json({ message: "Chỉ được chọn Place của Partner đã VERIFIED và active." }, { status: 400 });

  const now = new Date();
  try {
    const promotion = await prisma.$transaction(async (tx) => {
      const created = await tx.promotion.create({
        data: {
          partnerId: p.id, createdByUserId: auth.access.applicationUserId,
          ...data(parsed.data), status: PromotionStatus.PENDING,
          submittedAt: now, isActive: false,
          places: { createMany: { data: placeIds.map((placeId) => ({ placeId })) } },
        },
        select: { id: true, title: true, status: true },
      });
      await tx.auditLog.create({ data: { actorUserId: auth.access.applicationUserId, action: "PARTNER_PROMOTION_SUBMIT", entityType: "Promotion", entityId: created.id, metadata: { partnerId: p.id, title: created.title } } });
      return created;
    });
    revalidatePath("/doi-tac/uu-dai"); revalidatePath("/quan-tri/uu-dai"); revalidatePath("/quan-tri");
    return NextResponse.json({ message: "Đã gửi chương trình để ADMIN xét duyệt.", promotion }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo chương trình." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeApi([AppRole.PARTNER]);
  if (!auth.ok) return auth.response;
  const p = await partner(auth.access.applicationUserId);
  if (!p) return NextResponse.json({ message: "Partner chưa được phê duyệt." }, { status: 403 });
  const parsed = updateInput.safeParse(await body(request));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });

  const existing = await prisma.promotion.findFirst({ where: { id: parsed.data.id, partnerId: p.id, deletedAt: null }, select: { id: true, status: true } });
  if (!existing) return NextResponse.json({ message: "Không tìm thấy chương trình." }, { status: 404 });
  const editableStatuses = new Set<PromotionStatus>([
    PromotionStatus.DRAFT,
    PromotionStatus.PENDING,
    PromotionStatus.REJECTED,
  ]);

  if (!editableStatuses.has(existing.status)) {
    return NextResponse.json({ message: "Chương trình đã duyệt/tạm ngưng không thể sửa trực tiếp." }, { status: 409 });
  }

  const placeIds = [...new Set(parsed.data.placeIds)];
  if (!(await placesOk(p.id, placeIds))) return NextResponse.json({ message: "Place áp dụng không hợp lệ." }, { status: 400 });

  try {
    const promotion = await prisma.$transaction(async (tx) => {
      await tx.promotionPlace.deleteMany({ where: { promotionId: existing.id } });
      const updated = await tx.promotion.update({
        where: { id: existing.id },
        data: {
          ...data(parsed.data), status: PromotionStatus.PENDING, submittedAt: new Date(),
          reviewedByUserId: null, reviewedAt: null, rejectionReason: null, isActive: false,
          places: { createMany: { data: placeIds.map((placeId) => ({ placeId })) } },
        },
        select: { id: true, title: true, status: true },
      });
      await tx.auditLog.create({ data: { actorUserId: auth.access.applicationUserId, action: "PARTNER_PROMOTION_RESUBMIT", entityType: "Promotion", entityId: updated.id, metadata: { partnerId: p.id, beforeStatus: existing.status, title: updated.title } } });
      return updated;
    });
    revalidatePath("/doi-tac/uu-dai"); revalidatePath("/quan-tri/uu-dai"); revalidatePath("/quan-tri");
    return NextResponse.json({ message: "Đã cập nhật và gửi lại chương trình.", promotion });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật chương trình." }, { status: 500 });
  }
}
