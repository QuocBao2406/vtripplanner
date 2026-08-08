
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const nullableText = (maxLength: number, message: string) =>
  z
    .string()
    .max(maxLength, message)
    .transform((value) => {
      const normalized = value.trim();

      return normalized ? normalized : null;
    });

const dateOfBirthSchema = z
  .string()
  .max(10, "Ngày sinh không hợp lệ.")
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Ngày sinh không hợp lệ.",
  )
  .refine((value) => {
    if (!value) {
      return true;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Ngày sinh không hợp lệ.");

const profileSchema = z.object({
  fullName: nullableText(150, "Họ và tên tối đa 150 ký tự."),
  displayName: nullableText(80, "Tên hiển thị tối đa 80 ký tự."),
  phone: nullableText(30, "Số điện thoại tối đa 30 ký tự."),
  dateOfBirth: dateOfBirthSchema,
  city: nullableText(100, "Tỉnh hoặc thành phố tối đa 100 ký tự."),
  bio: nullableText(500, "Giới thiệu bản thân tối đa 500 ký tự."),
});

function serializeProfile(profile: {
  fullName: string | null;
  displayName: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  city: string | null;
  bio: string | null;
  updatedAt: Date;
}) {
  return {
    fullName: profile.fullName ?? "",
    displayName: profile.displayName ?? "",
    phone: profile.phone ?? "",
    dateOfBirth: profile.dateOfBirth
      ? profile.dateOfBirth.toISOString().slice(0, 10)
      : "",
    city: profile.city ?? "",
    bio: profile.bio ?? "",
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return NextResponse.json(
      {
        message: "Vui lòng đăng nhập để cập nhật hồ sơ.",
      },
      {
        status: 401,
      },
    );
  }

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
    select: {
      id: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (
    !applicationUser ||
    !applicationUser.isActive ||
    applicationUser.deletedAt
  ) {
    return NextResponse.json(
      {
        message: "Tài khoản hiện không được phép cập nhật hồ sơ.",
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

  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "Vui lòng kiểm tra lại thông tin hồ sơ.",
      },
      {
        status: 400,
      },
    );
  }

  const dateOfBirth = parsed.data.dateOfBirth
    ? new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`)
    : null;

  try {
    const profile = await prisma.userProfile.upsert({
      where: {
        userId: applicationUser.id,
      },
      create: {
        userId: applicationUser.id,
        fullName: parsed.data.fullName,
        displayName: parsed.data.displayName,
        phone: parsed.data.phone,
        dateOfBirth,
        city: parsed.data.city,
        bio: parsed.data.bio,
      },
      update: {
        fullName: parsed.data.fullName,
        displayName: parsed.data.displayName,
        phone: parsed.data.phone,
        dateOfBirth,
        city: parsed.data.city,
        bio: parsed.data.bio,
      },
      select: {
        fullName: true,
        displayName: true,
        phone: true,
        dateOfBirth: true,
        city: true,
        bio: true,
        updatedAt: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/tai-khoan");

    return NextResponse.json({
      message: "Hồ sơ cá nhân đã được cập nhật thành công.",
      profile: serializeProfile(profile),
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}
