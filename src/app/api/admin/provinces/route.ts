
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminApiAccess } from "@/lib/admin/require-admin-api";
import { prisma } from "@/lib/prisma";

const createProvinceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên khu vực cần ít nhất 2 ký tự.")
    .max(100, "Tên khu vực tối đa 100 ký tự."),
  code: z.string().trim().max(20, "Mã khu vực tối đa 20 ký tự."),
  slug: z.string().trim().max(120, "Slug tối đa 120 ký tự."),
  isActive: z.boolean().optional().default(true),
});

const updateProvinceSchema = createProvinceSchema.extend({
  id: z.string().uuid("ID khu vực không hợp lệ."),
});

const deleteProvinceSchema = z.object({
  id: z.string().uuid("ID khu vực không hợp lệ."),
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
    .slice(0, 120);
}

function normalizeCode(value: string, name: string): string {
  const base = value.trim() || slugify(name).replaceAll("-", "_");

  return base
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function provinceConflict(
  code: string,
  slug: string,
  excludeId?: string,
) {
  return prisma.province.findFirst({
    where: {
      ...(excludeId
        ? {
            NOT: {
              id: excludeId,
            },
          }
        : {}),
      OR: [
        {
          code,
        },
        {
          slug,
        },
      ],
    },
    select: {
      code: true,
      slug: true,
    },
  });
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

  const parsed = createProvinceSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Dữ liệu khu vực không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const slug = slugify(parsed.data.slug || parsed.data.name);
  const code = normalizeCode(parsed.data.code, parsed.data.name);

  if (!slug || !code) {
    return NextResponse.json(
      {
        message: "Không thể tạo mã hoặc slug hợp lệ cho khu vực.",
      },
      {
        status: 400,
      },
    );
  }

  const conflict = await provinceConflict(code, slug);

  if (conflict) {
    return NextResponse.json(
      {
        message:
          conflict.code === code
            ? `Mã khu vực ${code} đã tồn tại.`
            : `Slug ${slug} đã tồn tại.`,
      },
      {
        status: 409,
      },
    );
  }

  try {
    const province = await prisma.province.create({
      data: {
        name: parsed.data.name,
        code,
        slug,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.userId,
        action: "ADMIN_PROVINCE_CREATE",
        entityType: "Province",
        entityId: province.id,
        metadata: {
          name: province.name,
          code: province.code,
          slug: province.slug,
        },
      },
    });

    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/khu-vuc");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json(
      {
        message: "Đã tạo khu vực du lịch.",
        province,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message: "Không thể tạo khu vực. Vui lòng thử lại.",
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

  const parsed = updateProvinceSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Dữ liệu khu vực không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const existing = await prisma.province.findUnique({
    where: {
      id: parsed.data.id,
    },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      isActive: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      {
        message: "Không tìm thấy khu vực.",
      },
      {
        status: 404,
      },
    );
  }

  const slug = slugify(parsed.data.slug || parsed.data.name);
  const code = normalizeCode(parsed.data.code, parsed.data.name);

  if (!slug || !code) {
    return NextResponse.json(
      {
        message: "Mã hoặc slug khu vực không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const conflict = await provinceConflict(
    code,
    slug,
    parsed.data.id,
  );

  if (conflict) {
    return NextResponse.json(
      {
        message:
          conflict.code === code
            ? `Mã khu vực ${code} đã tồn tại.`
            : `Slug ${slug} đã tồn tại.`,
      },
      {
        status: 409,
      },
    );
  }

  try {
    const province = await prisma.province.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
        code,
        slug,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.userId,
        action: "ADMIN_PROVINCE_UPDATE",
        entityType: "Province",
        entityId: province.id,
        metadata: {
          before: existing,
          after: province,
        },
      },
    });

    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/khu-vuc");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json({
      message: "Đã cập nhật khu vực du lịch.",
      province,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể cập nhật khu vực. Vui lòng thử lại.",
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

  const parsed = deleteProvinceSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "ID khu vực không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const province = await prisma.province.findUnique({
    where: {
      id: parsed.data.id,
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          districts: true,
          places: true,
          trips: true,
        },
      },
    },
  });

  if (!province) {
    return NextResponse.json(
      {
        message: "Không tìm thấy khu vực.",
      },
      {
        status: 404,
      },
    );
  }

  const referenceCount =
    province._count.districts +
    province._count.places +
    province._count.trips;

  if (referenceCount > 0) {
    return NextResponse.json(
      {
        message:
          "Khu vực đang được địa điểm, quận/huyện hoặc chuyến đi sử dụng. " +
          "Hãy chuyển sang trạng thái tạm ẩn thay vì xóa.",
      },
      {
        status: 409,
      },
    );
  }

  try {
    await prisma.province.delete({
      where: {
        id: province.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.userId,
        action: "ADMIN_PROVINCE_DELETE",
        entityType: "Province",
        entityId: province.id,
        metadata: {
          name: province.name,
        },
      },
    });

    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/khu-vuc");
    revalidatePath("/quan-tri/dia-diem");

    return NextResponse.json({
      message: "Đã xóa khu vực chưa được sử dụng.",
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể xóa khu vực. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
