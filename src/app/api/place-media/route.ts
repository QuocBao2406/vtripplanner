import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  AppRole,
  PartnerApprovalStatus,
  PlaceVerificationStatus,
} from "@/generated/prisma/enums";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import {
  PLACE_IMAGE_BUCKET,
  getPublicPlaceImageUrl,
} from "@/lib/place-media/public-url";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminStorageClient } from "@/lib/supabase/admin-storage";

export const runtime = "nodejs";

const MAX_PLACE_IMAGES = 8;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const PARTNER_EDITABLE_STATUSES =
  new Set<PlaceVerificationStatus>([
    PlaceVerificationStatus.DRAFT,
    PlaceVerificationStatus.PENDING,
    PlaceVerificationStatus.REJECTED,
  ]);

type ManagedPlace = {
  id: string;
  name: string;
  partnerId: string | null;
  verificationStatus: PlaceVerificationStatus;
  images: Array<{
    id: string;
    storagePath: string;
    isCover: boolean;
    sortOrder: number;
  }>;
};

type PlaceMediaAccess =
  | {
      ok: true;
      actorUserId: string;
      actorKind: "ADMIN" | "PARTNER";
      place: ManagedPlace;
    }
  | {
      ok: false;
      response: NextResponse;
    };

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

function revalidatePlaceMediaPaths() {
  revalidatePath("/");
  revalidatePath("/dia-diem");
  revalidatePath("/lap-lich-trinh");
  revalidatePath("/quan-tri");
  revalidatePath("/quan-tri/dia-diem");
  revalidatePath("/doi-tac");
  revalidatePath("/doi-tac/dia-diem");
}

async function getPlaceMediaAccess(
  placeId: string,
): Promise<PlaceMediaAccess> {
  const authorization =
    await getCurrentAuthorization();

  if (authorization.status === "anonymous") {
    return {
      ok: false,
      response: errorResponse(
        401,
        "AUTH_REQUIRED",
        "Vui lòng đăng nhập để quản lý ảnh địa điểm.",
      ),
    };
  }

  if (authorization.status === "inactive") {
    return {
      ok: false,
      response: errorResponse(
        403,
        "ACCOUNT_INACTIVE",
        "Tài khoản hiện không được phép thao tác.",
      ),
    };
  }

  const { access } = authorization;
  const isAdmin =
    access.roles.includes(AppRole.ADMIN);
  const isPartner =
    access.roles.includes(AppRole.PARTNER);

  if (!isAdmin && !isPartner) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "ROLE_REQUIRED",
        "Chỉ ADMIN hoặc PARTNER hợp lệ mới có thể quản lý ảnh địa điểm.",
      ),
    };
  }

  const place = await prisma.place.findFirst({
    where: {
      id: placeId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      partnerId: true,
      verificationStatus: true,
      images: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          storagePath: true,
          isCover: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!place) {
    return {
      ok: false,
      response: errorResponse(
        404,
        "PLACE_NOT_FOUND",
        "Không tìm thấy địa điểm.",
      ),
    };
  }

  if (isAdmin) {
    return {
      ok: true,
      actorUserId: access.applicationUserId,
      actorKind: "ADMIN",
      place,
    };
  }

  const partner = await prisma.partner.findFirst({
    where: {
      ownerUserId: access.applicationUserId,
      approvalStatus:
        PartnerApprovalStatus.APPROVED,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!partner || place.partnerId !== partner.id) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "PARTNER_PLACE_FORBIDDEN",
        "Bạn chỉ có thể quản lý ảnh của địa điểm thuộc Partner của mình.",
      ),
    };
  }

  if (
    !PARTNER_EDITABLE_STATUSES.has(
      place.verificationStatus,
    )
  ) {
    return {
      ok: false,
      response: errorResponse(
        409,
        "PLACE_MEDIA_LOCKED",
        "Địa điểm đã được duyệt hoặc tạm ngưng. Vui lòng liên hệ ADMIN nếu cần thay ảnh.",
      ),
    };
  }

  return {
    ok: true,
    actorUserId: access.applicationUserId,
    actorKind: "PARTNER",
    place,
  };
}

function isManagedStoragePath(
  storagePath: string,
): boolean {
  return !(
    storagePath.startsWith("/") ||
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://")
  );
}

async function removeUploadedPaths(
  storagePaths: string[],
) {
  if (storagePaths.length === 0) {
    return;
  }

  try {
    const supabase =
      createSupabaseAdminStorageClient();
    const { error } = await supabase.storage
      .from(PLACE_IMAGE_BUCKET)
      .remove(storagePaths);

    if (error) {
      console.error(
        "Place image cleanup failed:",
        error,
      );
    }
  } catch (error) {
    console.error(
      "Place image cleanup client failed:",
      error,
    );
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      "INVALID_FORM_DATA",
      "Không thể đọc dữ liệu ảnh địa điểm.",
    );
  }

  const rawPlaceId = formData.get("placeId");
  const placeId =
    typeof rawPlaceId === "string"
      ? rawPlaceId.trim()
      : "";

  if (!UUID_PATTERN.test(placeId)) {
    return errorResponse(
      400,
      "INVALID_PLACE_ID",
      "ID địa điểm không hợp lệ.",
    );
  }

  const access =
    await getPlaceMediaAccess(placeId);

  if (!access.ok) {
    return access.response;
  }

  const files = formData
    .getAll("media")
    .filter(
      (entry): entry is File =>
        entry instanceof File &&
        entry.size > 0,
    );

  if (files.length === 0) {
    return errorResponse(
      400,
      "IMAGE_REQUIRED",
      "Hãy chọn ít nhất một ảnh.",
    );
  }

  if (
    access.place.images.length + files.length >
    MAX_PLACE_IMAGES
  ) {
    return errorResponse(
      400,
      "TOO_MANY_IMAGES",
      `Mỗi địa điểm tối đa ${MAX_PLACE_IMAGES} ảnh.`,
    );
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return errorResponse(
        400,
        "IMAGE_TYPE_NOT_ALLOWED",
        "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.",
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return errorResponse(
        400,
        "IMAGE_TOO_LARGE",
        "Mỗi ảnh phải có dung lượng không quá 6 MB.",
      );
    }
  }

  const rawCoverIndex = formData.get(
    "coverIndex",
  );
  const parsedCoverIndex =
    typeof rawCoverIndex === "string" &&
    rawCoverIndex.trim() !== ""
      ? Number(rawCoverIndex)
      : null;

  const coverIndex =
    parsedCoverIndex !== null &&
    Number.isInteger(parsedCoverIndex) &&
    parsedCoverIndex >= 0 &&
    parsedCoverIndex < files.length
      ? parsedCoverIndex
      : null;

  const hasExistingCover =
    access.place.images.some(
      (image) => image.isCover,
    );
  const shouldReplaceCover =
    coverIndex !== null;
  const firstSortOrder =
    access.place.images.reduce(
      (maximum, image) =>
        Math.max(maximum, image.sortOrder),
      -1,
    ) + 1;

  let supabase;

  try {
    supabase =
      createSupabaseAdminStorageClient();
  } catch {
    return errorResponse(
      500,
      "STORAGE_NOT_CONFIGURED",
      "Storage dành cho ảnh địa điểm chưa được cấu hình trên server.",
    );
  }

  const uploaded: Array<{
    storagePath: string;
    altText: string;
    sortOrder: number;
    isCover: boolean;
  }> = [];

  for (
    let index = 0;
    index < files.length;
    index += 1
  ) {
    const file = files[index];
    const extension =
      ALLOWED_IMAGE_TYPES.get(file.type);

    if (!extension) {
      continue;
    }

    const storagePath =
      `${access.place.id}/` +
      `${randomUUID()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from(PLACE_IMAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "Place image upload failed:",
        uploadError,
      );

      await removeUploadedPaths(
        uploaded.map(
          (image) => image.storagePath,
        ),
      );

      return errorResponse(
        500,
        "IMAGE_UPLOAD_FAILED",
        "Không thể tải ảnh địa điểm lên Storage. Vui lòng thử lại.",
      );
    }

    uploaded.push({
      storagePath,
      altText: `Ảnh ${index + 1} của ${access.place.name}`.slice(
        0,
        255,
      ),
      sortOrder: firstSortOrder + index,
      isCover:
        coverIndex === index ||
        (!hasExistingCover &&
          !shouldReplaceCover &&
          index === 0),
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (shouldReplaceCover) {
        await tx.placeImage.updateMany({
          where: {
            placeId: access.place.id,
          },
          data: {
            isCover: false,
          },
        });
      }

      await tx.placeImage.createMany({
        data: uploaded.map((image) => ({
          placeId: access.place.id,
          storagePath: image.storagePath,
          altText: image.altText,
          isCover: image.isCover,
          sortOrder: image.sortOrder,
        })),
      });

      await tx.auditLog.create({
        data: {
          actorUserId: access.actorUserId,
          action:
            access.actorKind === "ADMIN"
              ? "ADMIN_PLACE_MEDIA_UPLOAD"
              : "PARTNER_PLACE_MEDIA_UPLOAD",
          entityType: "Place",
          entityId: access.place.id,
          metadata: {
            imageCount: uploaded.length,
            setCover: uploaded.some(
              (image) => image.isCover,
            ),
          },
        },
      });
    });
  } catch (error) {
    console.error(
      "Place image database create failed:",
      error,
    );

    await removeUploadedPaths(
      uploaded.map(
        (image) => image.storagePath,
      ),
    );

    return errorResponse(
      500,
      "IMAGE_DATABASE_FAILED",
      "Ảnh đã tải lên nhưng không thể lưu metadata. Hệ thống đã thử dọn file vừa tải.",
    );
  }

  revalidatePlaceMediaPaths();

  return NextResponse.json(
    {
      ok: true,
      count: uploaded.length,
      images: uploaded.map((image) => ({
        url: getPublicPlaceImageUrl(
          image.storagePath,
        ),
        isCover: image.isCover,
      })),
      message: `Đã tải ${uploaded.length} ảnh cho ${access.place.name}.`,
    },
    { status: 201 },
  );
}

export async function PATCH(
  request: Request,
): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (
    !body ||
    typeof body !== "object"
  ) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Dữ liệu chọn ảnh cover không hợp lệ.",
    );
  }

  const record = body as Record<
    string,
    unknown
  >;
  const placeId =
    typeof record.placeId === "string"
      ? record.placeId.trim()
      : "";
  const imageId =
    typeof record.imageId === "string"
      ? record.imageId.trim()
      : "";

  if (
    !UUID_PATTERN.test(placeId) ||
    !UUID_PATTERN.test(imageId)
  ) {
    return errorResponse(
      400,
      "INVALID_MEDIA_ID",
      "Địa điểm hoặc ảnh không hợp lệ.",
    );
  }

  const access =
    await getPlaceMediaAccess(placeId);

  if (!access.ok) {
    return access.response;
  }

  const image =
    access.place.images.find(
      (candidate) =>
        candidate.id === imageId,
    );

  if (!image) {
    return errorResponse(
      404,
      "IMAGE_NOT_FOUND",
      "Không tìm thấy ảnh thuộc địa điểm này.",
    );
  }

  try {
    await prisma.$transaction([
      prisma.placeImage.updateMany({
        where: {
          placeId: access.place.id,
        },
        data: {
          isCover: false,
        },
      }),
      prisma.placeImage.update({
        where: {
          id: image.id,
        },
        data: {
          isCover: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: access.actorUserId,
          action:
            access.actorKind === "ADMIN"
              ? "ADMIN_PLACE_MEDIA_SET_COVER"
              : "PARTNER_PLACE_MEDIA_SET_COVER",
          entityType: "Place",
          entityId: access.place.id,
          metadata: {
            imageId: image.id,
          },
        },
      }),
    ]);
  } catch {
    return errorResponse(
      500,
      "SET_COVER_FAILED",
      "Không thể đặt ảnh cover. Vui lòng thử lại.",
    );
  }

  revalidatePlaceMediaPaths();

  return NextResponse.json({
    ok: true,
    message: "Đã đặt ảnh cover cho địa điểm.",
  });
}

export async function DELETE(
  request: Request,
): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (
    !body ||
    typeof body !== "object"
  ) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Dữ liệu xóa ảnh không hợp lệ.",
    );
  }

  const record = body as Record<
    string,
    unknown
  >;
  const placeId =
    typeof record.placeId === "string"
      ? record.placeId.trim()
      : "";
  const imageId =
    typeof record.imageId === "string"
      ? record.imageId.trim()
      : "";

  if (
    !UUID_PATTERN.test(placeId) ||
    !UUID_PATTERN.test(imageId)
  ) {
    return errorResponse(
      400,
      "INVALID_MEDIA_ID",
      "Địa điểm hoặc ảnh không hợp lệ.",
    );
  }

  const access =
    await getPlaceMediaAccess(placeId);

  if (!access.ok) {
    return access.response;
  }

  const image =
    access.place.images.find(
      (candidate) =>
        candidate.id === imageId,
    );

  if (!image) {
    return errorResponse(
      404,
      "IMAGE_NOT_FOUND",
      "Không tìm thấy ảnh thuộc địa điểm này.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.placeImage.delete({
        where: {
          id: image.id,
        },
      });

      if (image.isCover) {
        const nextImage =
          await tx.placeImage.findFirst({
            where: {
              placeId: access.place.id,
            },
            orderBy: [
              {
                sortOrder: "asc",
              },
              {
                id: "asc",
              },
            ],
            select: {
              id: true,
            },
          });

        if (nextImage) {
          await tx.placeImage.update({
            where: {
              id: nextImage.id,
            },
            data: {
              isCover: true,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId: access.actorUserId,
          action:
            access.actorKind === "ADMIN"
              ? "ADMIN_PLACE_MEDIA_DELETE"
              : "PARTNER_PLACE_MEDIA_DELETE",
          entityType: "Place",
          entityId: access.place.id,
          metadata: {
            imageId: image.id,
            wasCover: image.isCover,
          },
        },
      });
    });
  } catch {
    return errorResponse(
      500,
      "IMAGE_DELETE_FAILED",
      "Không thể xóa ảnh địa điểm. Vui lòng thử lại.",
    );
  }

  if (isManagedStoragePath(image.storagePath)) {
    await removeUploadedPaths([
      image.storagePath,
    ]);
  }

  revalidatePlaceMediaPaths();

  return NextResponse.json({
    ok: true,
    message:
      "Đã xóa ảnh. Nếu đó là cover, hệ thống đã chọn ảnh kế tiếp làm cover.",
  });
}
