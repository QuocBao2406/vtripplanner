
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AppRole,
  PartnerApprovalStatus,
  PlaceVerificationStatus,
} from "@/generated/prisma/enums";
import { authorizeApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

const nullableText = (maxLength: number, message: string) =>
  z
    .string()
    .max(maxLength, message)
    .transform((value) => {
      const normalized = value.trim();

      return normalized ? normalized : null;
    });

const optionalEmail = z
  .string()
  .trim()
  .max(320, "Email tối đa 320 ký tự.")
  .refine(
    (value) =>
      value === "" ||
      z.string().email().safeParse(value).success,
    "Email không hợp lệ.",
  )
  .transform((value) => (value ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .max(2048, "Website URL quá dài.")
  .refine(
    (value) =>
      value === "" ||
      z.string().url().safeParse(value).success,
    "Website URL không hợp lệ.",
  )
  .transform((value) => (value ? value : null));

const placeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên địa điểm cần ít nhất 2 ký tự.")
    .max(200, "Tên địa điểm tối đa 200 ký tự."),
  slug: z.string().trim().max(220, "Slug tối đa 220 ký tự."),
  categoryId: z.string().uuid("Danh mục không hợp lệ."),
  provinceId: z.string().uuid("Khu vực không hợp lệ."),
  districtId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().uuid().safeParse(value).success,
      "Quận/huyện không hợp lệ.",
    ),
  addressLine: z
    .string()
    .trim()
    .min(2, "Địa chỉ cần ít nhất 2 ký tự.")
    .max(255, "Địa chỉ tối đa 255 ký tự."),
  ward: nullableText(100, "Phường/xã tối đa 100 ký tự."),
  shortDescription: z
    .string()
    .trim()
    .min(10, "Mô tả ngắn cần ít nhất 10 ký tự.")
    .max(500, "Mô tả ngắn tối đa 500 ký tự."),
  description: nullableText(
    5000,
    "Mô tả chi tiết tối đa 5000 ký tự.",
  ),
  phone: nullableText(30, "Số điện thoại tối đa 30 ký tự."),
  email: optionalEmail,
  websiteUrl: optionalUrl,
});

const updatePlaceSchema = placeInputSchema.extend({
  id: z.string().uuid("ID địa điểm không hợp lệ."),
});

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getApprovedPartner(ownerUserId: string) {
  return prisma.partner.findFirst({
    where: {
      ownerUserId,
      approvalStatus: PartnerApprovalStatus.APPROVED,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
}

async function validateReferences(input: {
  categoryId: string;
  provinceId: string;
  districtId: string;
}) {
  const [category, province, district] = await Promise.all([
    prisma.placeCategory.findUnique({
      where: {
        id: input.categoryId,
      },
      select: {
        id: true,
        isActive: true,
      },
    }),
    prisma.province.findUnique({
      where: {
        id: input.provinceId,
      },
      select: {
        id: true,
        slug: true,
        isActive: true,
      },
    }),
    input.districtId
      ? prisma.district.findUnique({
          where: {
            id: input.districtId,
          },
          select: {
            id: true,
            provinceId: true,
            isActive: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!category || !category.isActive) {
    return {
      ok: false as const,
      message: "Danh mục không tồn tại hoặc đang tạm ẩn.",
    };
  }

  if (!province || !province.isActive) {
    return {
      ok: false as const,
      message: "Khu vực không tồn tại hoặc đang tạm ẩn.",
    };
  }

  if (
    input.districtId &&
    (!district ||
      !district.isActive ||
      district.provinceId !== province.id)
  ) {
    return {
      ok: false as const,
      message: "Quận/huyện không thuộc khu vực đã chọn.",
    };
  }

  return {
    ok: true as const,
    provinceSlug: province.slug,
  };
}

async function placeSlugConflict(
  slug: string,
  excludeId?: string,
) {
  return prisma.place.findFirst({
    where: {
      slug,
      ...(excludeId
        ? {
            NOT: {
              id: excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });
}

function resolveSlug(
  name: string,
  explicitSlug: string,
  provinceSlug: string,
  partnerSlug: string,
): string {
  const normalizedExplicit = slugify(explicitSlug);

  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  return slugify(`${name}-${provinceSlug}-${partnerSlug}`);
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeApi([AppRole.PARTNER]);

  if (!authorization.ok) {
    return authorization.response;
  }

  const { access } = authorization;
  const partner = await getApprovedPartner(access.applicationUserId);

  if (!partner) {
    return NextResponse.json(
      {
        message:
          "Chỉ Partner đã được ADMIN phê duyệt mới có thể gửi địa điểm.",
      },
      {
        status: 403,
      },
    );
  }

  const parsed = placeInputSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Dữ liệu địa điểm không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const references = await validateReferences(parsed.data);

  if (!references.ok) {
    return NextResponse.json(
      {
        message: references.message,
      },
      {
        status: 400,
      },
    );
  }

  const slug = resolveSlug(
    parsed.data.name,
    parsed.data.slug,
    references.provinceSlug,
    partner.slug,
  );

  if (!slug) {
    return NextResponse.json(
      {
        message: "Không thể tạo slug hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  if (await placeSlugConflict(slug)) {
    return NextResponse.json(
      {
        message: `Slug ${slug} đã tồn tại. Hãy chọn slug khác.`,
      },
      {
        status: 409,
      },
    );
  }

  const now = new Date();

  try {
    const place = await prisma.place.create({
      data: {
        partnerId: partner.id,
        categoryId: parsed.data.categoryId,
        provinceId: parsed.data.provinceId,
        districtId: parsed.data.districtId || null,
        createdByUserId: access.applicationUserId,
        name: parsed.data.name,
        slug,
        shortDescription: parsed.data.shortDescription,
        description: parsed.data.description,
        addressLine: parsed.data.addressLine,
        ward: parsed.data.ward,
        phone: parsed.data.phone,
        email: parsed.data.email,
        websiteUrl: parsed.data.websiteUrl,
        verificationStatus: PlaceVerificationStatus.PENDING,
        submittedAt: now,
        reviewedByUserId: null,
        reviewedAt: null,
        rejectionReason: null,
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.applicationUserId,
        action: "PARTNER_PLACE_SUBMIT",
        entityType: "Place",
        entityId: place.id,
        metadata: {
          partnerId: partner.id,
          partnerName: partner.name,
          name: place.name,
          verificationStatus: place.verificationStatus,
        },
      },
    });

    revalidatePath("/doi-tac");
    revalidatePath("/doi-tac/dia-diem");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json(
      {
        message:
          "Đã gửi địa điểm. Địa điểm đang PENDING và chờ ADMIN phê duyệt.",
        place,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message: "Không thể gửi địa điểm. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const authorization = await authorizeApi([AppRole.PARTNER]);

  if (!authorization.ok) {
    return authorization.response;
  }

  const { access } = authorization;
  const partner = await getApprovedPartner(access.applicationUserId);

  if (!partner) {
    return NextResponse.json(
      {
        message:
          "Chỉ Partner đã được ADMIN phê duyệt mới có thể cập nhật địa điểm.",
      },
      {
        status: 403,
      },
    );
  }

  const parsed = updatePlaceSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Dữ liệu địa điểm không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const existing = await prisma.place.findFirst({
    where: {
      id: parsed.data.id,
      partnerId: partner.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      verificationStatus: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      {
        message: "Không tìm thấy địa điểm thuộc Partner này.",
      },
      {
        status: 404,
      },
    );
  }

  const editableStatuses = new Set<PlaceVerificationStatus>([
    PlaceVerificationStatus.DRAFT,
    PlaceVerificationStatus.PENDING,
    PlaceVerificationStatus.REJECTED,
  ]);

  if (!editableStatuses.has(existing.verificationStatus)) {
    return NextResponse.json(
      {
        message:
          "Địa điểm đã được duyệt hoặc tạm ngưng nên chưa hỗ trợ sửa trực tiếp. " +
          "Vui lòng liên hệ ADMIN nếu cần thay đổi.",
      },
      {
        status: 409,
      },
    );
  }

  const references = await validateReferences(parsed.data);

  if (!references.ok) {
    return NextResponse.json(
      {
        message: references.message,
      },
      {
        status: 400,
      },
    );
  }

  const slug = resolveSlug(
    parsed.data.name,
    parsed.data.slug,
    references.provinceSlug,
    partner.slug,
  );

  if (!slug) {
    return NextResponse.json(
      {
        message: "Slug địa điểm không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  if (await placeSlugConflict(slug, existing.id)) {
    return NextResponse.json(
      {
        message: `Slug ${slug} đã tồn tại. Hãy chọn slug khác.`,
      },
      {
        status: 409,
      },
    );
  }

  const now = new Date();

  try {
    const place = await prisma.place.update({
      where: {
        id: existing.id,
      },
      data: {
        categoryId: parsed.data.categoryId,
        provinceId: parsed.data.provinceId,
        districtId: parsed.data.districtId || null,
        name: parsed.data.name,
        slug,
        shortDescription: parsed.data.shortDescription,
        description: parsed.data.description,
        addressLine: parsed.data.addressLine,
        ward: parsed.data.ward,
        phone: parsed.data.phone,
        email: parsed.data.email,
        websiteUrl: parsed.data.websiteUrl,
        verificationStatus: PlaceVerificationStatus.PENDING,
        submittedAt: now,
        reviewedByUserId: null,
        reviewedAt: null,
        rejectionReason: null,
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.applicationUserId,
        action: "PARTNER_PLACE_RESUBMIT",
        entityType: "Place",
        entityId: place.id,
        metadata: {
          partnerId: partner.id,
          beforeStatus: existing.verificationStatus,
          afterStatus: place.verificationStatus,
          name: place.name,
        },
      },
    });

    revalidatePath("/doi-tac");
    revalidatePath("/doi-tac/dia-diem");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json({
      message:
        "Đã cập nhật và gửi lại địa điểm. Hồ sơ đang chờ ADMIN phê duyệt.",
      place,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể cập nhật địa điểm. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
