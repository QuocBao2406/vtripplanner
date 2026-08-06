"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  profileSchema,
  type ProfileActionState,
} from "@/lib/profile/validation";

export async function updateProfileAction(
  previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  void previousState;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      status: "error",
      message:
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại.",
    };
  }

  const parsedResult = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    city: formData.get("city"),
    bio: formData.get("bio"),
  });

  if (!parsedResult.success) {
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin hồ sơ.",
      fieldErrors: parsedResult.error.flatten().fieldErrors,
    };
  }

  try {
    const applicationUser = await prisma.user.findUnique({
      where: {
        id: currentUser.id,
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
      return {
        status: "error",
        message:
          "Tài khoản ứng dụng không tồn tại hoặc đã bị vô hiệu hóa.",
      };
    }

    await prisma.userProfile.upsert({
      where: {
        userId: currentUser.id,
      },
      create: {
        userId: currentUser.id,
        fullName: parsedResult.data.fullName,
        displayName: parsedResult.data.displayName,
        phone: parsedResult.data.phone,
        dateOfBirth: parsedResult.data.dateOfBirth,
        city: parsedResult.data.city,
        bio: parsedResult.data.bio,
      },
      update: {
        fullName: parsedResult.data.fullName,
        displayName: parsedResult.data.displayName,
        phone: parsedResult.data.phone,
        dateOfBirth: parsedResult.data.dateOfBirth,
        city: parsedResult.data.city,
        bio: parsedResult.data.bio,
      },
    });

    revalidatePath("/tai-khoan");

    return {
      status: "success",
      message: "Hồ sơ cá nhân đã được cập nhật thành công.",
    };
  } catch {
    return {
      status: "error",
      message:
        "Không thể cập nhật hồ sơ vào lúc này. Vui lòng thử lại.",
    };
  }
}