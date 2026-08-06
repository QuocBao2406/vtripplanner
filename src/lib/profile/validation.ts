import { z } from "zod";

function optionalTextSchema(
  maximumLength: number,
  maximumLengthMessage: string,
) {
  return z
    .string()
    .trim()
    .max(maximumLength, maximumLengthMessage)
    .transform((value) => (value.length > 0 ? value : null));
}

const phoneSchema = z
  .string()
  .trim()
  .max(30, "Số điện thoại không được vượt quá 30 ký tự.")
  .refine(
    (value) =>
      value.length === 0 ||
      /^[0-9+().\-\s]+$/.test(value),
    "Số điện thoại chứa ký tự không hợp lệ.",
  )
  .transform((value) => (value.length > 0 ? value : null));

const dateOfBirthSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value.length === 0) {
      return true;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value
      .split("-")
      .map((part) => Number(part));

    if (year < 1900) {
      return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Ngày sinh không hợp lệ hoặc phải từ năm 1900 trở đi.")
  .refine((value) => {
    if (value.length === 0) {
      return true;
    }

    const selectedDate = new Date(`${value}T00:00:00.000Z`);
    const now = new Date();

    const today = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ),
    );

    return selectedDate <= today;
  }, "Ngày sinh không được nằm trong tương lai.")
  .transform((value) =>
    value.length > 0
      ? new Date(`${value}T00:00:00.000Z`)
      : null,
  );

export const profileSchema = z.object({
  fullName: optionalTextSchema(
    150,
    "Họ và tên không được vượt quá 150 ký tự.",
  ),
  displayName: optionalTextSchema(
    80,
    "Tên hiển thị không được vượt quá 80 ký tự.",
  ),
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
  city: optionalTextSchema(
    100,
    "Tỉnh hoặc thành phố không được vượt quá 100 ký tự.",
  ),
  bio: optionalTextSchema(
    500,
    "Giới thiệu bản thân không được vượt quá 500 ký tự.",
  ),
});

export type ProfileFieldName =
  | "fullName"
  | "displayName"
  | "phone"
  | "dateOfBirth"
  | "city"
  | "bio";

export type ProfileActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<ProfileFieldName, string[]>>;
};