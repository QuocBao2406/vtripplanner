import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  PASSWORD_RECOVERY_COOKIE_NAME,
  PASSWORD_RECOVERY_COOKIE_VALUE,
} from "@/lib/auth/password-recovery";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | VTripPlanner",
  description: "Thiết lập mật khẩu mới cho tài khoản VTripPlanner.",
};

export default async function ResetPasswordPage() {
  const [user, cookieStore] = await Promise.all([
    getCurrentUser(),
    cookies(),
  ]);

  const recoveryCookie = cookieStore.get(
    PASSWORD_RECOVERY_COOKIE_NAME,
  );

  const recoverySessionIsValid =
    Boolean(user) &&
    recoveryCookie?.value === PASSWORD_RECOVERY_COOKIE_VALUE;

  if (!recoverySessionIsValid) {
    redirect(
      `/quen-mat-khau?error=${encodeURIComponent(
        "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu một liên kết mới.",
      )}`,
    );
  }

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
        Bảo mật tài khoản
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        Đặt lại mật khẩu
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Tạo mật khẩu mới cho tài khoản. Sau khi lưu, phiên khôi phục
        sẽ kết thúc và bạn cần đăng nhập lại.
      </p>

      <AuthForm mode="reset-password" />
    </section>
  );
}