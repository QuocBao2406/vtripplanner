"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  signInSchema,
  signUpSchema,
  type AuthActionState,
} from "@/lib/auth/validation";

function getAuthErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Bạn cần xác nhận địa chỉ email trước khi đăng nhập.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "Email này đã được đăng ký.";
  }

  if (normalizedMessage.includes("signup is disabled")) {
    return "Chức năng đăng ký hiện đang bị tắt.";
  }

  if (normalizedMessage.includes("password should be at least")) {
    return "Mật khẩu chưa đáp ứng độ dài tối thiểu.";
  }

  if (normalizedMessage.includes("email rate limit exceeded")) {
    return "Bạn đã gửi quá nhiều yêu cầu email. Vui lòng thử lại sau.";
  }

  return "Không thể hoàn thành yêu cầu. Vui lòng thử lại.";
}

export async function signInAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const parsedResult = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedResult.success) {
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin đăng nhập.",
      fieldErrors: parsedResult.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsedResult.data.email,
    password: parsedResult.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: getAuthErrorMessage(error.message),
    };
  }

  redirect("/tai-khoan");
}

export async function signUpAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const parsedResult = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsedResult.success) {
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin đăng ký.",
      fieldErrors: parsedResult.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();

  const requestOrigin = requestHeaders.get("origin");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  const siteOrigin =
    requestOrigin ??
    (host ? `${protocol}://${host}` : "http://localhost:3000");

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsedResult.data.email,
    password: parsedResult.data.password,
    options: {
      emailRedirectTo: `${siteOrigin}/auth/confirm?next=/tai-khoan`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: getAuthErrorMessage(error.message),
    };
  }

  if (data.session) {
    redirect("/tai-khoan");
  }

  return {
    status: "success",
    message:
      "Đăng ký thành công. Hãy mở email và nhấn liên kết xác nhận tài khoản.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect(
      `/tai-khoan?error=${encodeURIComponent(
        "Không thể đăng xuất. Vui lòng thử lại.",
      )}`,
    );
  }

  redirect(
    `/dang-nhap?message=${encodeURIComponent("Bạn đã đăng xuất thành công.")}`,
  );
}
