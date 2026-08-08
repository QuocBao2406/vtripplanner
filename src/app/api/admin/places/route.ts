
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PlaceVerificationStatus } from "@/generated/prisma/enums";
import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
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

function coordinateSchema(
  min: number,
  max: number,
  label: string,
) {
  return z
    .string()
    .trim()
    .max(30, `${label} không hợp lệ.`)
    .refine((value) => {
      if (!value) {
        return true;
      }

      const parsed = Number(value);

      return Number.isFinite(parsed) && parsed >= min && parsed <= max;
    }, `${label} không hợp lệ.`)
    .transform((value) => (value ? value : null));
}

const placeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên địa điểm cần ít nhất 2 ký tự.")
    .max(200, "Tên địa điểm tối đa 200 ký tự."),
  slug: z.string().trim().max(220, "Slug tối đa 220 ký tự."),
  categoryId: z.string().uuid("Danh mục địa điểm không hợp lệ."),
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
  shortDescription: nullableText(
    500,
    "Mô tả ngắn tối đa 500 ký tự.",
  ),
  description: nullableText(
    5000,
    "Mô tả chi tiết tối đa 5000 ký tự.",
  ),
  latitude: coordinateSchema(-90, 90, "Vĩ độ"),
  longitude: coordinateSchema(-180, 180, "Kinh độ"),
  phone: nullableText(30, "Số điện thoại tối đa 30 ký tự."),
  email: optionalEmail,
  websiteUrl: optionalUrl,
  isActive: z.boolean().optional().default(true),
});

const createPlaceSchema = placeInputSchema;

const updatePlaceSchema = placeInputSchema.extend({
  id: z.string().uuid("ID địa điểm không hợp lệ."),
});

const deletePlaceSchema = z.object({
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
      message: "Danh mục địa điểm không tồn tại hoặc đang tạm ẩn.",
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

function createResolvedSlug(
  name: string,
  slug: string,
  provinceSlug: string,
): string {
  const explicit = slugify(slug);

  if (explicit) {
    return explicit;
  }

  return slugify(`${name}-${provinceSlug}`);
}

export async function POST(request: Request): Promise<NextResponse> {
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

  const parsed = createPlaceSchema.safeParse(await parseJson(request));

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

  const slug = createResolvedSlug(
    parsed.data.name,
    parsed.data.slug,
    references.provinceSlug,
  );

  if (!slug) {
    return NextResponse.json(
      {
        message: "Không thể tạo slug hợp lệ cho địa điểm.",
      },
      {
        status: 400,
      },
    );
  }

  if (await placeSlugConflict(slug)) {
    return NextResponse.json(
      {
        message: `Slug ${slug} đã tồn tại.`,
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
        categoryId: parsed.data.categoryId,
        provinceId: parsed.data.provinceId,
        districtId: parsed.data.districtId || null,
        createdByUserId: access.userId,
        reviewedByUserId: access.userId,
        name: parsed.data.name,
        slug,
        shortDescription: parsed.data.shortDescription,
        description: parsed.data.description,
        addressLine: parsed.data.addressLine,
        ward: parsed.data.ward,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        phone: parsed.data.phone,
        email: parsed.data.email,
        websiteUrl: parsed.data.websiteUrl,
        verificationStatus: PlaceVerificationStatus.VERIFIED,
        submittedAt: now,
        reviewedAt: now,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.userId,
        action: "ADMIN_PLACE_CREATE",
        entityType: "Place",
        entityId: place.id,
        metadata: {
          name: place.name,
          slug: place.slug,
          verificationStatus: "VERIFIED",
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dia-diem");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json(
      {
        message:
          "Đã tạo địa điểm và xác minh ngay vì dữ liệu do ADMIN nhập.",
        place,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message: "Không thể tạo địa điểm. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}

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
        message: "Không tìm thấy địa điểm.",
      },
      {
        status: 404,
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

  const slug = createResolvedSlug(
    parsed.data.name,
    parsed.data.slug,
    references.provinceSlug,
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

  if (await placeSlugConflict(slug, parsed.data.id)) {
    return NextResponse.json(
      {
        message: `Slug ${slug} đã tồn tại.`,
      },
      {
        status: 409,
      },
    );
  }

  try {
    const place = await prisma.place.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        categoryId: parsed.data.categoryId,
        provinceId: parsed.data.provinceId,
        districtId: parsed.data.districtId || null,
        reviewedByUserId: access.userId,
        name: parsed.data.name,
        slug,
        shortDescription: parsed.data.shortDescription,
        description: parsed.data.description,
        addressLine: parsed.data.addressLine,
        ward: parsed.data.ward,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        phone: parsed.data.phone,
        email: parsed.data.email,
        websiteUrl: parsed.data.websiteUrl,
        verificationStatus: PlaceVerificationStatus.VERIFIED,
        rejectionReason: null,
        reviewedAt: new Date(),
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        verificationStatus: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.userId,
        action: "ADMIN_PLACE_UPDATE",
        entityType: "Place",
        entityId: place.id,
        metadata: {
          before: existing,
          after: place,
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dia-diem");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json({
      message: "Đã cập nhật địa điểm.",
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

export async function DELETE(request: Request): Promise<NextResponse> {
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

  const parsed = deletePlaceSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "ID địa điểm không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const existing = await prisma.place.findFirst({
    where: {
      id: parsed.data.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      {
        message: "Không tìm thấy địa điểm.",
      },
      {
        status: 404,
      },
    );
  }

  try {
    await prisma.place.update({
      where: {
        id: existing.id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.userId,
        action: "ADMIN_PLACE_SOFT_DELETE",
        entityType: "Place",
        entityId: existing.id,
        metadata: existing,
      },
    });

    revalidatePath("/");
    revalidatePath("/dia-diem");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json({
      message: "Đã xóa mềm địa điểm khỏi hệ thống hoạt động.",
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể xóa địa điểm. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
