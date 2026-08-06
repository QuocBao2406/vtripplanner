"use client";

import { useActionState } from "react";

import { updateProfileAction } from "@/app/tai-khoan/actions";
import type {
  ProfileActionState,
  ProfileFieldName,
} from "@/lib/profile/validation";

export type ProfileInitialValues = {
  fullName: string;
  displayName: string;
  phone: string;
  dateOfBirth: string;
  city: string;
  bio: string;
};

type ProfileFormProps = {
  initialValues: ProfileInitialValues;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";

function FieldErrors({
  fieldName,
  state,
}: {
  fieldName: ProfileFieldName;
  state: ProfileActionState;
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

export function ProfileForm({
  initialValues,
}: ProfileFormProps) {
  const initialState: ProfileActionState = {
    status: "idle",
    message: "",
  };

  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="profile-full-name"
            className="text-sm font-semibold text-slate-800"
          >
            Họ và tên
          </label>

          <input
            id="profile-full-name"
            name="fullName"
            type="text"
            autoComplete="name"
            defaultValue={initialValues.fullName}
            placeholder="Nguyễn Văn An"
            maxLength={150}
            disabled={isPending}
            aria-invalid={Boolean(
              state.fieldErrors?.fullName?.length,
            )}
            className={inputClassName}
          />

          <FieldErrors fieldName="fullName" state={state} />
        </div>

        <div>
          <label
            htmlFor="profile-display-name"
            className="text-sm font-semibold text-slate-800"
          >
            Tên hiển thị
          </label>

          <input
            id="profile-display-name"
            name="displayName"
            type="text"
            autoComplete="nickname"
            defaultValue={initialValues.displayName}
            placeholder="An"
            maxLength={80}
            disabled={isPending}
            aria-invalid={Boolean(
              state.fieldErrors?.displayName?.length,
            )}
            className={inputClassName}
          />

          <FieldErrors fieldName="displayName" state={state} />
        </div>

        <div>
          <label
            htmlFor="profile-phone"
            className="text-sm font-semibold text-slate-800"
          >
            Số điện thoại
          </label>

          <input
            id="profile-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={initialValues.phone}
            placeholder="0901234567"
            maxLength={30}
            disabled={isPending}
            aria-invalid={Boolean(
              state.fieldErrors?.phone?.length,
            )}
            className={inputClassName}
          />

          <FieldErrors fieldName="phone" state={state} />
        </div>

        <div>
          <label
            htmlFor="profile-date-of-birth"
            className="text-sm font-semibold text-slate-800"
          >
            Ngày sinh
          </label>

          <input
            id="profile-date-of-birth"
            name="dateOfBirth"
            type="date"
            autoComplete="bday"
            defaultValue={initialValues.dateOfBirth}
            disabled={isPending}
            aria-invalid={Boolean(
              state.fieldErrors?.dateOfBirth?.length,
            )}
            className={inputClassName}
          />

          <FieldErrors
            fieldName="dateOfBirth"
            state={state}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="profile-city"
            className="text-sm font-semibold text-slate-800"
          >
            Tỉnh hoặc thành phố
          </label>

          <input
            id="profile-city"
            name="city"
            type="text"
            autoComplete="address-level1"
            defaultValue={initialValues.city}
            placeholder="Thành phố Hồ Chí Minh"
            maxLength={100}
            disabled={isPending}
            aria-invalid={Boolean(
              state.fieldErrors?.city?.length,
            )}
            className={inputClassName}
          />

          <FieldErrors fieldName="city" state={state} />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="profile-bio"
            className="text-sm font-semibold text-slate-800"
          >
            Giới thiệu bản thân
          </label>

          <textarea
            id="profile-bio"
            name="bio"
            rows={5}
            defaultValue={initialValues.bio}
            placeholder="Chia sẻ ngắn gọn về phong cách và sở thích du lịch của bạn."
            maxLength={500}
            disabled={isPending}
            aria-invalid={Boolean(
              state.fieldErrors?.bio?.length,
            )}
            className={`${inputClassName} resize-y`}
          />

          <div className="mt-2 flex items-start justify-between gap-4">
            <FieldErrors fieldName="bio" state={state} />

            <p className="ml-auto text-xs text-slate-500">
              Tối đa 500 ký tự
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {isPending
            ? "Đang lưu hồ sơ..."
            : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}