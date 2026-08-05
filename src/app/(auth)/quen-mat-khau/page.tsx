import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Quên mật khẩu | VTripPlanner",
  description: "Yêu cầu liên kết đặt lại mật khẩu VTripPlanner.",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

function getFirstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/tai-khoan");
  }

  const parameters = await searchParams;
  const errorMessage = getFirstValue(parameters.error);
  const successMessage = getFirstValue(parameters.message);

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
        Khôi phục tài khoản
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        Quên mật khẩu
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Nhập email tài khoản. Hệ thống sẽ gửi một liên kết để bạn
        thiết lập mật khẩu mới.
      </p>

      <AuthForm
        mode="forgot-password"
        initialMessage={errorMessage ?? successMessage}
        initialStatus={
          errorMessage
            ? "error"
            : successMessage
              ? "success"
              : undefined
        }
      />
    </section>
  );
}