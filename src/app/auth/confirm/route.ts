import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(nextPath: string | null): string {
  if (
    nextPath &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//")
  ) {
    return nextPath;
  }

  return "/tai-khoan";
}

function createLoginErrorResponse(
  request: NextRequest,
  message: string,
): NextResponse {
  const redirectUrl = new URL("/dang-nhap", request.url);
  redirectUrl.searchParams.set("error", message);

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = getSafeNextPath(
    request.nextUrl.searchParams.get("next"),
  );

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return createLoginErrorResponse(
        request,
        "Liên kết xác nhận không hợp lệ hoặc đã hết hạn.",
      );
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      return createLoginErrorResponse(
        request,
        "Liên kết xác nhận không hợp lệ hoặc đã hết hạn.",
      );
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return createLoginErrorResponse(
    request,
    "Liên kết xác nhận thiếu thông tin cần thiết.",
  );
}
