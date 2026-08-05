"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInAction,
  signUpAction,
} from "@/app/auth/actions";
import type {
  AuthActionState,
  AuthFieldName,
} from "@/lib/auth/validation";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  initialMessage?: string;
  initialStatus?: "error" | "success";
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";

function FieldErrors({
  fieldName,
  state,
}: {
  fieldName: AuthFieldName;
  state: AuthActionState;
}) {
  const errors = state.fieldErrors?.[fieldName];

  if (!errors?.length) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      {errors.map((error, index) => (
        <p
          key={`${fieldName}-${index}`}
          className="text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ))}
    </div>
  );
}

export function AuthForm({
  mode,
  initialMessage = "",
  initialStatus,
}: AuthFormProps) {
  const action = mode === "sign-in" ? signInAction : signUpAction;

  const initialState: AuthActionState = {
    status: initialStatus ?? "idle",
    message: initialMessage,
  };

  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );

  const isSignUp = mode === "sign-up";

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label
          htmlFor={`${mode}-email`}
          className="text-sm font-semibold text-slate-800"
        >
          Email
        </label>
        <input
          id={`${mode}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          required
          maxLength={320}
          disabled={isPending}
          aria-invalid={Boolean(state.fieldErrors?.email?.length)}
          className={inputClassName}
        />
        <FieldErrors fieldName="email" state={state} />
      </div>

      <div>
        <label
          htmlFor={`${mode}-password`}
          className="text-sm font-semibold text-slate-800"
        >
          Mật khẩu
        </label>
        <input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder={isSignUp ? "Ít nhất 8 ký tự" : "Nhập mật khẩu"}
          required
          minLength={isSignUp ? 8 : undefined}
          maxLength={72}
          disabled={isPending}
          aria-invalid={Boolean(state.fieldErrors?.password?.length)}
          className={inputClassName}
        />
        <FieldErrors fieldName="password" state={state} />

        {isSignUp ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Cần có chữ hoa, chữ thường và ít nhất một chữ số.
          </p>
        ) : null}
      </div>

      {isSignUp ? (
        <div>
          <label
            htmlFor="sign-up-confirm-password"
            className="text-sm font-semibold text-slate-800"
          >
            Nhập lại mật khẩu
          </label>
          <input
            id="sign-up-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            required
            minLength={8}
            maxLength={72}
            disabled={isPending}
            aria-invalid={Boolean(
              state.fieldErrors?.confirmPassword?.length,
            )}
            className={inputClassName}
          />
          <FieldErrors fieldName="confirmPassword" state={state} />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {isPending
          ? "Đang xử lý..."
          : isSignUp
            ? "Tạo tài khoản"
            : "Đăng nhập"}
      </button>

      <p className="text-center text-sm text-slate-600">
        {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
        <Link
          href={isSignUp ? "/dang-nhap" : "/dang-ky"}
          className="font-bold text-emerald-700 underline-offset-4 hover:underline"
        >
          {isSignUp ? "Đăng nhập" : "Đăng ký"}
        </Link>
      </p>
    </form>
  );
}
