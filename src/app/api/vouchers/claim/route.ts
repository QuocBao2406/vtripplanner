
import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AppRole,
  PartnerApprovalStatus,
  PlaceVerificationStatus,
  PromotionStatus,
  VoucherClaimStatus,
} from "@/generated/prisma/enums";
import { authorizeApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

const claimSchema = z.object({
  promotionId: z.string().uuid("ID chương trình không hợp lệ."),
});

class VoucherClaimError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "VoucherClaimError";
  }
}

function generateVoucherCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let token = "";

  for (const byte of bytes) {
    token += alphabet[byte % alphabet.length];
  }

  return `VTP-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(
    8,
    12,
  )}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeApi([AppRole.USER]);

  if (!authorization.ok) {
    return authorization.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = claimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Dữ liệu lưu voucher không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const userId = authorization.access.applicationUserId;
  const promotionId = parsed.data.promotionId;

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<
        Array<{
          id: string;
        }>
      >`
        SELECT "id"
        FROM "promotions"
        WHERE "id" = ${promotionId}::uuid
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new VoucherClaimError(
          "Không tìm thấy chương trình ưu đãi.",
          404,
        );
      }

      const existing = await transaction.voucherClaim.findUnique({
        where: {
          promotionId_userId: {
            promotionId,
            userId,
          },
        },
        select: {
          id: true,
          code: true,
          expiresAt: true,
          status: true,
        },
      });

      if (existing) {
        return {
          claim: existing,
          alreadyClaimed: true,
        };
      }

      const now = new Date();

      const promotion = await transaction.promotion.findFirst({
        where: {
          id: promotionId,
          status: PromotionStatus.APPROVED,
          isActive: true,
          deletedAt: null,
          startAt: {
            lte: now,
          },
          endAt: {
            gt: now,
          },
          partner: {
            approvalStatus: PartnerApprovalStatus.APPROVED,
            deletedAt: null,
          },
          places: {
            some: {
              place: {
                verificationStatus:
                  PlaceVerificationStatus.VERIFIED,
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
        select: {
          id: true,
          title: true,
          endAt: true,
          totalQuantity: true,
        },
      });

      if (!promotion) {
        throw new VoucherClaimError(
          "Ưu đãi không còn khả dụng hoặc chưa đến thời gian áp dụng.",
          409,
        );
      }

      if (promotion.totalQuantity !== null) {
        const claimedCount =
          await transaction.voucherClaim.count({
            where: {
              promotionId: promotion.id,
            },
          });

        if (claimedCount >= promotion.totalQuantity) {
          throw new VoucherClaimError(
            "Chương trình đã hết số lượng voucher.",
            409,
          );
        }
      }

      const claim = await transaction.voucherClaim.create({
        data: {
          promotionId: promotion.id,
          userId,
          code: generateVoucherCode(),
          status: VoucherClaimStatus.CLAIMED,
          expiresAt: promotion.endAt,
        },
        select: {
          id: true,
          code: true,
          expiresAt: true,
          status: true,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId: userId,
          action: "VOUCHER_CLAIM",
          entityType: "VoucherClaim",
          entityId: claim.id,
          metadata: {
            promotionId: promotion.id,
            promotionTitle: promotion.title,
            voucherCode: claim.code,
          },
        },
      });

      return {
        claim,
        alreadyClaimed: false,
      };
    });

    revalidatePath("/uu-dai");
    revalidatePath("/voucher-cua-toi");
    revalidatePath(`/voucher-cua-toi/${result.claim.id}`);
    revalidatePath("/doi-tac/uu-dai");
    revalidatePath("/quan-tri/uu-dai");

    return NextResponse.json(
      {
        message: result.alreadyClaimed
          ? "Bạn đã lưu voucher này trước đó."
          : "Đã lưu voucher và tạo mã riêng cho tài khoản.",
        claim: result.claim,
        alreadyClaimed: result.alreadyClaimed,
      },
      {
        status: result.alreadyClaimed ? 200 : 201,
      },
    );
  } catch (error) {
    if (error instanceof VoucherClaimError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: error.status,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Không thể lưu voucher. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
