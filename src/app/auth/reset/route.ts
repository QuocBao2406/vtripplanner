import { type NextRequest, NextResponse } from "next/server";

import {
  PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
  PASSWORD_RECOVERY_COOKIE_NAME,
  PASSWORD_RECOVERY_COOKIE_VALUE,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(nextPath: string | null): string {
  if (
    nextPath &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//")
  ) {
    return nextPath;
  }

  return "/dat-lai-mat-khau";
}

function createRecoveryErrorResponse(
  request: NextRequest,
  message: string,
): NextResponse {
  const redirectUrl = new URL("/quen-mat-khau", request.url);
  redirectUrl.searchParams.set("error", message);

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextPath = getSafeNextPath(
    request.nextUrl.searchParams.get("next"),
  );

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return createRecoveryErrorResponse(
        request,
        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      );
    }
  } else if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (error) {
      return createRecoveryErrorResponse(
        request,
        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      );
    }
  } else {
    return createRecoveryErrorResponse(
      request,
      "Liên kết đặt lại mật khẩu thiếu thông tin cần thiết.",
    );
  }

  const response = NextResponse.redirect(
    new URL(nextPath, request.url),
  );

  response.cookies.set(
    PASSWORD_RECOVERY_COOKIE_NAME,
    PASSWORD_RECOVERY_COOKIE_VALUE,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
    },
  );

  return response;
}