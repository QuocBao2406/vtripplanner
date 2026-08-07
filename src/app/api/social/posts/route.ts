import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TRAVEL_POST_MEDIA_BUCKET = "travel-post-media";
const MAX_CAPTION_LENGTH = 2000;
const MAX_MEDIA_BYTES = 6 * 1024 * 1024;

type AllowedMediaType = "IMAGE" | "VIDEO";

const ALLOWED_MEDIA_TYPES = new Map<
  string,
  { extension: string; type: AllowedMediaType }
>([
  ["image/jpeg", { extension: "jpg", type: "IMAGE" }],
  ["image/png", { extension: "png", type: "IMAGE" }],
  ["image/webp", { extension: "webp", type: "IMAGE" }],
  ["video/mp4", { extension: "mp4", type: "VIDEO" }],
  ["video/webm", { extension: "webm", type: "VIDEO" }],
]);

function errorResponse(
  status: number,
  error: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
    },
    { status },
  );
}

async function getAuthenticatedApplicationUser() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return {
      ok: false as const,
      response: errorResponse(
        401,
        "AUTH_REQUIRED",
        "Vui lòng đăng nhập để chia sẻ chuyến đi.",
      ),
    };
  }

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!applicationUser) {
    return {
      ok: false as const,
      response: errorResponse(
        403,
        "APPLICATION_USER_REQUIRED",
        "Tài khoản chưa sẵn sàng để đăng bài.",
      ),
    };
  }

  return {
    ok: true as const,
    authUser,
    applicationUser,
  };
}

export async function GET(): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  const profile = authorization.applicationUser.profile;

  return NextResponse.json({
    ok: true,
    viewer: {
      displayName:
        profile?.displayName ??
        profile?.fullName ??
        authorization.authUser.email ??
        "Bạn",
      avatarUrl: profile?.avatarUrl ?? null,
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      "INVALID_FORM_DATA",
      "Không thể đọc dữ liệu bài đăng.",
    );
  }

  const rawCaption = formData.get("caption");
  const mediaEntry = formData.get("media");

  const caption =
    typeof rawCaption === "string" ? rawCaption.trim() : "";

  if (!caption) {
    return errorResponse(
      400,
      "CAPTION_REQUIRED",
      "Hãy viết vài dòng về chuyến đi của bạn.",
    );
  }

  if (caption.length > MAX_CAPTION_LENGTH) {
    return errorResponse(
      400,
      "CAPTION_TOO_LONG",
      `Nội dung bài viết tối đa ${MAX_CAPTION_LENGTH} ký tự.`,
    );
  }

  if (!(mediaEntry instanceof File) || mediaEntry.size <= 0) {
    return errorResponse(
      400,
      "MEDIA_REQUIRED",
      "Hãy chọn một ảnh hoặc một video để đăng.",
    );
  }

  if (mediaEntry.size > MAX_MEDIA_BYTES) {
    return errorResponse(
      400,
      "MEDIA_TOO_LARGE",
      "Ảnh hoặc video phải có dung lượng không quá 6 MB.",
    );
  }

  const mediaDefinition = ALLOWED_MEDIA_TYPES.get(mediaEntry.type);

  if (!mediaDefinition) {
    return errorResponse(
      400,
      "MEDIA_TYPE_NOT_ALLOWED",
      "Chỉ hỗ trợ JPEG, PNG, WebP, MP4 hoặc WebM.",
    );
  }

  const storagePath =
    `${authorization.authUser.id}/` +
    `${randomUUID()}.${mediaDefinition.extension}`;

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from(TRAVEL_POST_MEDIA_BUCKET)
    .upload(storagePath, mediaEntry, {
      cacheControl: "3600",
      contentType: mediaEntry.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Travel post media upload failed:", uploadError);

    return errorResponse(
      500,
      "MEDIA_UPLOAD_FAILED",
      "Không thể tải media lên. Vui lòng thử lại.",
    );
  }

  const authorLabel =
    authorization.authUser.email ?? "người dùng VTripPlanner";

  const mediaAltText = (
    mediaDefinition.type === "IMAGE"
      ? `Ảnh chuyến đi của ${authorLabel}`
      : `Video chuyến đi của ${authorLabel}`
  ).slice(0, 255);

  try {
    const post = await prisma.travelPost.create({
      data: {
        type: "USER_TRIP",
        status: "PUBLISHED",
        caption,
        seasonMonths: [],
        publishedAt: new Date(),
        author: {
          connect: {
            id: authorization.applicationUser.id,
          },
        },
        media: {
          create: {
            type: mediaDefinition.type,
            storagePath,
            mimeType: mediaEntry.type,
            fileSizeBytes: mediaEntry.size,
            altText: mediaAltText,
            sortOrder: 0,
          },
        },
      },
      select: {
        id: true,
      },
    });

    revalidatePath("/");

    return NextResponse.json(
      {
        ok: true,
        postId: post.id,
        message: "Đã đăng chuyến đi của bạn.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Travel post database create failed:", error);

    const { error: cleanupError } = await supabase.storage
      .from(TRAVEL_POST_MEDIA_BUCKET)
      .remove([storagePath]);

    if (cleanupError) {
      console.error(
        "Travel post media cleanup after database failure failed:",
        cleanupError,
      );
    }

    return errorResponse(
      500,
      "POST_CREATE_FAILED",
      "Không thể tạo bài đăng. Vui lòng thử lại.",
    );
  }
}
