import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Đăng ký | VTripPlanner",
  description: "Tạo tài khoản VTripPlanner.",
};

export default async function SignUpPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/tai-khoan");
  }

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
        Bắt đầu hành trình
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        Tạo tài khoản
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Đăng ký để lưu thông tin và xây dựng lịch trình du lịch cá nhân hóa.
      </p>

      <AuthForm mode="sign-up" />
    </section>
  );
}
