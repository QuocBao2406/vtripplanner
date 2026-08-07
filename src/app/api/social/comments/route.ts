import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_COMMENT_LENGTH = 2000;
const MAX_VISIBLE_COMMENTS = 50;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        "Vui lòng đăng nhập để bình luận.",
      ),
    };
  }

  const applicationUser = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
    select: {
      id: true,
    },
  });

  if (!applicationUser) {
    return {
      ok: false as const,
      response: errorResponse(
        403,
        "APPLICATION_USER_REQUIRED",
        "Tài khoản chưa sẵn sàng để bình luận.",
      ),
    };
  }

  return {
    ok: true as const,
    applicationUser,
  };
}

async function getPublishedPost(postId: string) {
  return prisma.travelPost.findFirst({
    where: {
      id: postId,
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
}

async function getCommentCount(postId: string): Promise<number> {
  return prisma.travelPostComment.count({
    where: {
      postId,
      status: "PUBLISHED",
      deletedAt: null,
    },
  });
}

async function getVisibleComment(
  commentId: string,
  viewerUserId: string | null,
) {
  const comment = await prisma.travelPostComment.findFirst({
    where: {
      id: commentId,
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      id: true,
      postId: true,
      userId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          profile: {
            select: {
              displayName: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!comment) {
    return null;
  }

  return {
    id: comment.id,
    postId: comment.postId,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    authorName:
      comment.user.profile?.displayName ??
      comment.user.profile?.fullName ??
      "Người dùng VTripPlanner",
    authorAvatarUrl: comment.user.profile?.avatarUrl ?? null,
    isOwner:
      viewerUserId !== null &&
      comment.userId === viewerUserId,
  };
}

function readStringField(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

function validateContent(content: string): NextResponse | null {
  if (!content) {
    return errorResponse(
      400,
      "COMMENT_REQUIRED",
      "Hãy nhập nội dung bình luận.",
    );
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    return errorResponse(
      400,
      "COMMENT_TOO_LONG",
      `Bình luận tối đa ${MAX_COMMENT_LENGTH} ký tự.`,
    );
  }

  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const postId = requestUrl.searchParams.get("postId")?.trim() ?? "";

  if (!UUID_PATTERN.test(postId)) {
    return errorResponse(
      400,
      "INVALID_POST_ID",
      "Bài đăng không hợp lệ.",
    );
  }

  const post = await getPublishedPost(postId);

  if (!post) {
    return errorResponse(
      404,
      "POST_NOT_FOUND",
      "Không tìm thấy bài đăng.",
    );
  }

  const currentUser = await getCurrentUser();
  const viewerUserId = currentUser?.id ?? null;

  try {
    const [commentCount, newestComments] = await Promise.all([
      getCommentCount(postId),
      prisma.travelPostComment.findMany({
        where: {
          postId,
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: MAX_VISIBLE_COMMENTS,
        select: {
          id: true,
          userId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              profile: {
                select: {
                  displayName: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const comments = newestComments
      .reverse()
      .map((comment) => ({
        id: comment.id,
        postId,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        authorName:
          comment.user.profile?.displayName ??
          comment.user.profile?.fullName ??
          "Người dùng VTripPlanner",
        authorAvatarUrl:
          comment.user.profile?.avatarUrl ?? null,
        isOwner:
          viewerUserId !== null &&
          comment.userId === viewerUserId,
      }));

    return NextResponse.json({
      ok: true,
      comments,
      commentCount,
      hasMore: commentCount > comments.length,
    });
  } catch (error) {
    console.error("Travel post comments read failed:", error);

    return errorResponse(
      500,
      "COMMENTS_READ_FAILED",
      "Không thể tải bình luận. Vui lòng thử lại.",
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Không thể đọc dữ liệu bình luận.",
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return errorResponse(
      400,
      "INVALID_COMMENT",
      "Dữ liệu bình luận không hợp lệ.",
    );
  }

  const record = payload as Record<string, unknown>;
  const postId = readStringField(record, "postId");
  const content = readStringField(record, "content");

  if (!UUID_PATTERN.test(postId)) {
    return errorResponse(
      400,
      "INVALID_POST_ID",
      "Bài đăng không hợp lệ.",
    );
  }

  const contentError = validateContent(content);

  if (contentError) {
    return contentError;
  }

  const post = await getPublishedPost(postId);

  if (!post) {
    return errorResponse(
      404,
      "POST_NOT_FOUND",
      "Không tìm thấy bài đăng.",
    );
  }

  const userId = authorization.applicationUser.id;

  try {
    const createdComment =
      await prisma.travelPostComment.create({
        data: {
          postId,
          userId,
          content,
          status: "PUBLISHED",
        },
        select: {
          id: true,
        },
      });

    const [comment, commentCount] = await Promise.all([
      getVisibleComment(createdComment.id, userId),
      getCommentCount(postId),
    ]);

    if (!comment) {
      throw new Error(
        "Created comment could not be read back.",
      );
    }

    revalidatePath("/");

    return NextResponse.json(
      {
        ok: true,
        comment,
        commentCount,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Travel post comment create failed:", error);

    return errorResponse(
      500,
      "COMMENT_CREATE_FAILED",
      "Không thể đăng bình luận. Vui lòng thử lại.",
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Không thể đọc dữ liệu chỉnh sửa.",
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return errorResponse(
      400,
      "INVALID_COMMENT",
      "Dữ liệu chỉnh sửa không hợp lệ.",
    );
  }

  const record = payload as Record<string, unknown>;
  const postId = readStringField(record, "postId");
  const commentId = readStringField(record, "commentId");
  const content = readStringField(record, "content");

  if (
    !UUID_PATTERN.test(postId) ||
    !UUID_PATTERN.test(commentId)
  ) {
    return errorResponse(
      400,
      "INVALID_COMMENT_ID",
      "Bình luận không hợp lệ.",
    );
  }

  const contentError = validateContent(content);

  if (contentError) {
    return contentError;
  }

  const post = await getPublishedPost(postId);

  if (!post) {
    return errorResponse(
      404,
      "POST_NOT_FOUND",
      "Không tìm thấy bài đăng.",
    );
  }

  const userId = authorization.applicationUser.id;

  try {
    const updateResult =
      await prisma.travelPostComment.updateMany({
        where: {
          id: commentId,
          postId,
          userId,
          status: "PUBLISHED",
          deletedAt: null,
        },
        data: {
          content,
        },
      });

    if (updateResult.count !== 1) {
      return errorResponse(
        403,
        "COMMENT_EDIT_FORBIDDEN",
        "Bạn chỉ có thể sửa bình luận của chính mình.",
      );
    }

    const [comment, commentCount] = await Promise.all([
      getVisibleComment(commentId, userId),
      getCommentCount(postId),
    ]);

    if (!comment) {
      throw new Error(
        "Updated comment could not be read back.",
      );
    }

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      comment,
      commentCount,
    });
  } catch (error) {
    console.error("Travel post comment update failed:", error);

    return errorResponse(
      500,
      "COMMENT_UPDATE_FAILED",
      "Không thể sửa bình luận. Vui lòng thử lại.",
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const authorization = await getAuthenticatedApplicationUser();

  if (!authorization.ok) {
    return authorization.response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Không thể đọc dữ liệu xóa bình luận.",
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return errorResponse(
      400,
      "INVALID_COMMENT",
      "Dữ liệu xóa bình luận không hợp lệ.",
    );
  }

  const record = payload as Record<string, unknown>;
  const postId = readStringField(record, "postId");
  const commentId = readStringField(record, "commentId");

  if (
    !UUID_PATTERN.test(postId) ||
    !UUID_PATTERN.test(commentId)
  ) {
    return errorResponse(
      400,
      "INVALID_COMMENT_ID",
      "Bình luận không hợp lệ.",
    );
  }

  const post = await getPublishedPost(postId);

  if (!post) {
    return errorResponse(
      404,
      "POST_NOT_FOUND",
      "Không tìm thấy bài đăng.",
    );
  }

  const userId = authorization.applicationUser.id;

  try {
    const deleteResult =
      await prisma.travelPostComment.updateMany({
        where: {
          id: commentId,
          postId,
          userId,
          status: "PUBLISHED",
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

    if (deleteResult.count !== 1) {
      return errorResponse(
        403,
        "COMMENT_DELETE_FORBIDDEN",
        "Bạn chỉ có thể xóa bình luận của chính mình.",
      );
    }

    const commentCount = await getCommentCount(postId);

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      commentId,
      commentCount,
    });
  } catch (error) {
    console.error("Travel post comment soft delete failed:", error);

    return errorResponse(
      500,
      "COMMENT_DELETE_FAILED",
      "Không thể xóa bình luận. Vui lòng thử lại.",
    );
  }
}
