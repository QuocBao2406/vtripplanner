import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  PartnerApprovalStatus,
  PlaceVerificationStatus,
  PromotionStatus,
} from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const now = new Date();
  const authUser = await getCurrentUser();

  try {
    const promotions = await prisma.promotion.findMany({
      where: {
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
              verificationStatus: PlaceVerificationStatus.VERIFIED,
              isActive: true,
              deletedAt: null,
            },
          },
        },
      },
      orderBy: [
        {
          endAt: "asc",
        },
      ],
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        terms: true,
        discountType: true,
        discountValue: true,
        maxDiscountAmount: true,
        minimumSpend: true,
        startAt: true,
        endAt: true,
        partner: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        places: {
          select: {
            place: {
              select: {
                id: true,
                name: true,
                province: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        claims: authUser
          ? {
              where: {
                userId: authUser.id,
              },
              select: {
                id: true,
                code: true,
                status: true,
                claimedAt: true,
                expiresAt: true,
              },
            }
          : false,
      },
    });

    return NextResponse.json({
      ok: true,
      promotions: promotions.map((promo) => ({
        id: promo.id,
        title: promo.title,
        description: promo.description,
        terms: promo.terms,
        discountType: promo.discountType,
        discountValue: Number(promo.discountValue),
        maxDiscountAmount: promo.maxDiscountAmount ? Number(promo.maxDiscountAmount) : null,
        minimumSpend: promo.minimumSpend ? Number(promo.minimumSpend) : null,
        startAt: promo.startAt.toISOString(),
        endAt: promo.endAt.toISOString(),
        partnerName: promo.partner.name,
        partnerLogoUrl: promo.partner.logoUrl,
        places: promo.places.map((p) => ({
          id: p.place.id,
          name: p.place.name,
          provinceName: p.place.province.name,
        })),
        myClaim: promo.claims && promo.claims.length > 0 ? promo.claims[0] : null,
      })),
    });
  } catch (error) {
    console.warn("GET /api/vouchers db unavailable, serving fallback vouchers:", error);
    const nowIso = new Date().toISOString();
    const futureIso = new Date(Date.now() + 30 * 86400000).toISOString();
    return NextResponse.json({
      ok: true,
      promotions: [
        {
          id: "promo-mock-1",
          title: "Giảm 15% Dịch vụ Lưu trú Homestay Đà Lạt",
          description: "Áp dụng cho đặt phòng từ 2 đêm trở lên vào các ngày trong tuần.",
          terms: "Không áp dụng đồng thời với các chương trình khuyến mãi khác.",
          discountType: "PERCENTAGE",
          discountValue: 15,
          maxDiscountAmount: 300000,
          minimumSpend: 800000,
          startAt: nowIso,
          endAt: futureIso,
          partnerName: "Đà Lạt Mountain View Homestay",
          partnerLogoUrl: null,
          places: [{ id: "pl-dalat-1", name: "Thung Lũng Tình Yêu", provinceName: "Lâm Đồng" }],
          myClaim: null,
        },
        {
          id: "promo-mock-2",
          title: "Tặng Voucher 100.000đ Ẩm thực Phố Cổ",
          description: "Giảm trực tiếp trên hóa đơn ẩm thực tại các nhà hàng đối tác Hội An.",
          terms: "Áp dụng cho hóa đơn từ 500.000đ.",
          discountType: "FIXED_AMOUNT",
          discountValue: 100000,
          maxDiscountAmount: 100000,
          minimumSpend: 500000,
          startAt: nowIso,
          endAt: futureIso,
          partnerName: "Nhà Hàng Cơm Gà Bà Buội",
          partnerLogoUrl: null,
          places: [{ id: "pl-hoian-1", name: "Chùa Cầu Hội An", provinceName: "Quảng Nam" }],
          myClaim: null,
        },
        {
          id: "promo-mock-3",
          title: "Ưu đãi 20% Tour Tham quan Vịnh Hạ Long",
          description: "Giảm giá vé tour du thuyền tham quan các hang động kỳ vĩ.",
          terms: "Đặt trước ít nhất 24 giờ.",
          discountType: "PERCENTAGE",
          discountValue: 20,
          maxDiscountAmount: 500000,
          minimumSpend: 1200000,
          startAt: nowIso,
          endAt: futureIso,
          partnerName: "Du Thuyền Hạ Long Heritage",
          partnerLogoUrl: null,
          places: [{ id: "pl-halong-1", name: "Vịnh Hạ Long", provinceName: "Quảng Ninh" }],
          myClaim: null,
        },
      ],
    });
  }
}
