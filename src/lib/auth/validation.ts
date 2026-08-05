import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email.")
  .max(320, "Email quá dài.")
  .email("Email không hợp lệ.");

const signInPasswordSchema = z
  .string()
  .min(1, "Vui lòng nhập mật khẩu.")
  .max(72, "Mật khẩu quá dài.");

const securePasswordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
  .max(72, "Mật khẩu quá dài.")
  .regex(/[a-z]/, "Mật khẩu cần có ít nhất một chữ thường.")
  .regex(/[A-Z]/, "Mật khẩu cần có ít nhất một chữ hoa.")
  .regex(/[0-9]/, "Mật khẩu cần có ít nhất một chữ số.");

export const signInSchema = z.object({
  email: emailSchema,
  password: signInPasswordSchema,
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: securePasswordSchema,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: securePasswordSchema,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp.",
    path: ["confirmPassword"],
  });

export type AuthFieldName = "email" | "password" | "confirmPassword";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<AuthFieldName, string[]>>;
};