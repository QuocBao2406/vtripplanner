
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AppRole,
  PartnerApprovalStatus,
} from "@/generated/prisma/enums";
import { authorizeApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

const PARTNER_TYPES = [
  "HOTEL",
  "HOMESTAY",
  "RESORT",
  "RESTAURANT",
  "EATERY",
  "CAFE",
  "ENTERTAINMENT_VENUE",
  "TOURIST_ATTRACTION",
  "TRANSPORT_PROVIDER",
  "RESCUE_SERVICE",
  "VEHICLE_REPAIR",
  "TRAVEL_SERVICE",
  "OTHER",
] as const;

const nullableText = (maxLength: number, message: string) =>
  z
    .string()
    .max(maxLength, message)
    .transform((value) => {
      const normalized = value.trim();

      return normalized ? normalized : null;
    });

const optionalUrl = z
  .string()
  .trim()
  .max(2048, "URL quá dài.")
  .refine(
    (value) =>
      value === "" ||
      z.string().url().safeParse(value).success,
    "URL không hợp lệ.",
  )
  .transform((value) => (value ? value : null));

const applicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên doanh nghiệp cần ít nhất 2 ký tự.")
    .max(200, "Tên doanh nghiệp tối đa 200 ký tự."),
  type: z.enum(PARTNER_TYPES),
  description: z
    .string()
    .trim()
    .min(20, "Giới thiệu doanh nghiệp cần ít nhất 20 ký tự.")
    .max(2000, "Giới thiệu tối đa 2000 ký tự."),
  phone: nullableText(30, "Số điện thoại tối đa 30 ký tự."),
  email: z
    .string()
    .trim()
    .email("Email liên hệ không hợp lệ.")
    .max(320, "Email tối đa 320 ký tự."),
  websiteUrl: optionalUrl,
  taxCode: nullableText(50, "Mã số thuế tối đa 50 ký tự."),
  businessLicenseUrl: optionalUrl,
});

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeApi();

  if (!authorization.ok) {
    return authorization.response;
  }

  const { access } = authorization;

  if (access.roles.includes(AppRole.ADMIN)) {
    return NextResponse.json(
      {
        message: "Tài khoản ADMIN không cần đăng ký Partner.",
      },
      {
        status: 403,
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "Dữ liệu gửi lên không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const parsed = applicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Thông tin đăng ký Partner không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const existing = await prisma.partner.findUnique({
    where: {
      ownerUserId: access.applicationUserId,
    },
    select: {
      id: true,
      slug: true,
      approvalStatus: true,
      deletedAt: true,
    },
  });

  if (
    existing?.approvalStatus === PartnerApprovalStatus.APPROVED
  ) {
    return NextResponse.json(
      {
        message: "Hồ sơ Partner đã được phê duyệt.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    existing?.approvalStatus === PartnerApprovalStatus.SUSPENDED
  ) {
    return NextResponse.json(
      {
        message:
          "Hồ sơ Partner đang bị tạm ngưng và không thể tự gửi lại.",
      },
      {
        status: 409,
      },
    );
  }

  const baseSlug =
    slugify(parsed.data.name).slice(0, 180) || "partner";
  const slug =
    existing?.slug ??
    `${baseSlug}-${access.applicationUserId.slice(0, 8)}`;

  const conflict = await prisma.partner.findFirst({
    where: {
      slug,
      NOT: {
        ownerUserId: access.applicationUserId,
      },
    },
    select: {
      id: true,
    },
  });

  if (conflict) {
    return NextResponse.json(
      {
        message: "Không thể tạo định danh Partner duy nhất.",
      },
      {
        status: 409,
      },
    );
  }

  const now = new Date();

  try {
    const partner = await prisma.partner.upsert({
      where: {
        ownerUserId: access.applicationUserId,
      },
      create: {
        ownerUserId: access.applicationUserId,
        name: parsed.data.name,
        slug,
        type: parsed.data.type,
        description: parsed.data.description,
        phone: parsed.data.phone,
        email: parsed.data.email,
        websiteUrl: parsed.data.websiteUrl,
        taxCode: parsed.data.taxCode,
        businessLicenseUrl: parsed.data.businessLicenseUrl,
        approvalStatus: PartnerApprovalStatus.PENDING,
        submittedAt: now,
      },
      update: {
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description,
        phone: parsed.data.phone,
        email: parsed.data.email,
        websiteUrl: parsed.data.websiteUrl,
        taxCode: parsed.data.taxCode,
        businessLicenseUrl: parsed.data.businessLicenseUrl,
        approvalStatus: PartnerApprovalStatus.PENDING,
        rejectionReason: null,
        reviewedByUserId: null,
        reviewedAt: null,
        submittedAt: now,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        approvalStatus: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: access.applicationUserId,
        action: existing
          ? "PARTNER_APPLICATION_RESUBMIT"
          : "PARTNER_APPLICATION_SUBMIT",
        entityType: "Partner",
        entityId: partner.id,
        metadata: {
          name: partner.name,
          approvalStatus: partner.approvalStatus,
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dang-ky-doi-tac");
    revalidatePath("/quan-tri");
    revalidatePath("/quan-tri/doi-tac");

    return NextResponse.json({
      message: existing
        ? "Đã cập nhật và gửi lại hồ sơ Partner."
        : "Đã gửi hồ sơ Partner để ADMIN xét duyệt.",
      status: partner.approvalStatus,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể gửi hồ sơ Partner. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
