"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  PASSWORD_RECOVERY_COOKIE_NAME,
  PASSWORD_RECOVERY_COOKIE_VALUE,
} from "@/lib/auth/password-recovery";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type AuthActionState,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

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

  if (
    normalizedMessage.includes("password should be different") ||
    normalizedMessage.includes("new password should be different")
  ) {
    return "Mật khẩu mới phải khác mật khẩu hiện tại.";
  }

  if (
    normalizedMessage.includes("email rate limit exceeded") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.";
  }

  if (
    normalizedMessage.includes("session") ||
    normalizedMessage.includes("jwt")
  ) {
    return "Phiên xác thực không hợp lệ hoặc đã hết hạn.";
  }

  return "Không thể hoàn thành yêu cầu. Vui lòng thử lại.";
}

async function getSiteOrigin(): Promise<string> {
  const requestHeaders = await headers();

  const requestOrigin = requestHeaders.get("origin");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return (
    requestOrigin ??
    (host ? `${protocol}://${host}` : "http://localhost:3000")
  );
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

  const siteOrigin = await getSiteOrigin();
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

export async function requestPasswordResetAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const parsedResult = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsedResult.success) {
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại địa chỉ email.",
      fieldErrors: parsedResult.error.flatten().fieldErrors,
    };
  }

  const siteOrigin = await getSiteOrigin();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsedResult.data.email,
    {
      redirectTo:
        `${siteOrigin}/auth/reset` +
        "?next=/dat-lai-mat-khau",
    },
  );

  if (error) {
    return {
      status: "error",
      message: getAuthErrorMessage(error.message),
    };
  }

  return {
    status: "success",
    message:
      "Nếu email thuộc một tài khoản hợp lệ, hệ thống đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục Spam hoặc Thư rác.",
  };
}

export async function updatePasswordAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const parsedResult = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsedResult.success) {
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại mật khẩu mới.",
      fieldErrors: parsedResult.error.flatten().fieldErrors,
    };
  }

  const cookieStore = await cookies();

  const recoveryCookie = cookieStore.get(
    PASSWORD_RECOVERY_COOKIE_NAME,
  );

  if (recoveryCookie?.value !== PASSWORD_RECOVERY_COOKIE_VALUE) {
    return {
      status: "error",
      message:
        "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu một liên kết mới.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    cookieStore.delete(PASSWORD_RECOVERY_COOKIE_NAME);

    return {
      status: "error",
      message:
        "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu một liên kết mới.",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsedResult.data.password,
  });

  if (updateError) {
    return {
      status: "error",
      message: getAuthErrorMessage(updateError.message),
    };
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE_NAME);

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    redirect(
      `/tai-khoan?error=${encodeURIComponent(
        "Mật khẩu đã được thay đổi nhưng không thể kết thúc phiên hiện tại. Hãy đăng xuất thủ công.",
      )}`,
    );
  }

  redirect(
    `/dang-nhap?message=${encodeURIComponent(
      "Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.",
    )}`,
  );
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
    `/dang-nhap?message=${encodeURIComponent(
      "Bạn đã đăng xuất thành công.",
    )}`,
  );
}