import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Đăng nhập | VTripPlanner",
  description: "Đăng nhập vào tài khoản VTripPlanner.",
};

type SignInPageProps = {
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

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
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
        Chào mừng trở lại
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        Đăng nhập
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Truy cập lịch trình, ngân sách và các địa điểm bạn đã lưu.
      </p>

      <AuthForm
        mode="sign-in"
        initialMessage={errorMessage ?? successMessage}
        initialStatus={errorMessage ? "error" : successMessage ? "success" : undefined}
      />
    </section>
  );
}
