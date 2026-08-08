
"use client";

import { Check, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";

type ProfileValue = {
  fullName: string;
  displayName: string;
  phone: string;
  dateOfBirth: string;
  city: string;
  bio: string;
  updatedAt: string | null;
};

type AccountProfileEditorProps = {
  initialProfile: ProfileValue;
};

type EditableProfile = Omit<ProfileValue, "updatedAt">;

type UpdateProfileResponse = {
  message?: string;
  profile?: ProfileValue;
};

const EMPTY_VALUE = "Chưa cung cấp";

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function toEditable(profile: ProfileValue): EditableProfile {
  return {
    fullName: profile.fullName,
    displayName: profile.displayName,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    city: profile.city,
    bio: profile.bio,
  };
}

function normalizeValue(value: string): string {
  return value.trim();
}

function profilesEqual(
  first: EditableProfile,
  second: EditableProfile,
): boolean {
  return (
    normalizeValue(first.fullName) === normalizeValue(second.fullName) &&
    normalizeValue(first.displayName) ===
      normalizeValue(second.displayName) &&
    normalizeValue(first.phone) === normalizeValue(second.phone) &&
    first.dateOfBirth === second.dateOfBirth &&
    normalizeValue(first.city) === normalizeValue(second.city) &&
    normalizeValue(first.bio) === normalizeValue(second.bio)
  );
}

function ViewField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-900">
        {value.trim() || EMPTY_VALUE}
      </dd>
    </div>
  );
}

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";

export function AccountProfileEditor({
  initialProfile,
}: AccountProfileEditorProps) {
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [form, setForm] = useState<EditableProfile>(
    toEditable(initialProfile),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isDirty = useMemo(
    () => !profilesEqual(form, toEditable(savedProfile)),
    [form, savedProfile],
  );

  function updateField<K extends keyof EditableProfile>(
    key: K,
    value: EditableProfile[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setSuccessMessage("");
    setErrorMessage("");
  }

  function handleStartEdit() {
    setForm(toEditable(savedProfile));
    setIsEditing(true);
    setSuccessMessage("");
    setErrorMessage("");
  }

  function handleCancel() {
    setForm(toEditable(savedProfile));
    setIsEditing(false);
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleSave() {
    if (!isDirty || isSaving) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      let payload: UpdateProfileResponse = {};

      try {
        payload = (await response.json()) as UpdateProfileResponse;
      } catch {
        payload = {};
      }

      if (response.status === 401) {
        window.location.href =
          "/dang-nhap?message=" +
          encodeURIComponent("Phiên đăng nhập đã hết hạn.");
        return;
      }

      if (response.status === 403) {
        window.location.href = "/khong-co-quyen?reason=inactive";
        return;
      }

      if (!response.ok || !payload.profile) {
        setErrorMessage(
          payload.message ??
            "Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại thông tin.",
        );
        return;
      }

      setSavedProfile(payload.profile);
      setForm(toEditable(payload.profile));
      setIsEditing(false);
      setSuccessMessage(
        payload.message ?? "Hồ sơ cá nhân đã được cập nhật thành công.",
      );
    } catch {
      setErrorMessage(
        "Không thể kết nối để cập nhật hồ sơ. Vui lòng thử lại.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Thông tin cá nhân
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            Hồ sơ của bạn
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Cập nhật gần nhất: {formatUpdatedAt(savedProfile.updatedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartEdit}
          disabled={isEditing || isSaving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <Pencil aria-hidden="true" className="size-4" />
          {isEditing ? "Đang chỉnh sửa" : "Chỉnh sửa"}
        </button>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-800"
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-800"
        >
          {errorMessage}
        </div>
      ) : null}

      {!isEditing ? (
        <dl className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2">
          <ViewField label="Họ và tên" value={savedProfile.fullName} />
          <ViewField
            label="Tên hiển thị"
            value={savedProfile.displayName}
          />
          <ViewField label="Số điện thoại" value={savedProfile.phone} />
          <ViewField
            label="Ngày sinh"
            value={
              savedProfile.dateOfBirth
                ? new Intl.DateTimeFormat("vi-VN").format(
                    new Date(`${savedProfile.dateOfBirth}T00:00:00`),
                  )
                : ""
            }
          />
          <ViewField
            label="Tỉnh hoặc thành phố"
            value={savedProfile.city}
            wide
          />
          <ViewField
            label="Giới thiệu bản thân"
            value={savedProfile.bio}
            wide
          />
        </dl>
      ) : (
        <form
          className="grid gap-4 pt-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label className="text-sm font-semibold text-slate-800">
            Họ và tên
            <input
              type="text"
              value={form.fullName}
              maxLength={150}
              disabled={isSaving}
              onChange={(event) => {
                updateField("fullName", event.target.value);
              }}
              className={inputClassName}
            />
          </label>

          <label className="text-sm font-semibold text-slate-800">
            Tên hiển thị
            <input
              type="text"
              value={form.displayName}
              maxLength={80}
              disabled={isSaving}
              onChange={(event) => {
                updateField("displayName", event.target.value);
              }}
              className={inputClassName}
            />
          </label>

          <label className="text-sm font-semibold text-slate-800">
            Số điện thoại
            <input
              type="tel"
              value={form.phone}
              maxLength={30}
              disabled={isSaving}
              onChange={(event) => {
                updateField("phone", event.target.value);
              }}
              className={inputClassName}
            />
          </label>

          <label className="text-sm font-semibold text-slate-800">
            Ngày sinh
            <input
              type="date"
              value={form.dateOfBirth}
              disabled={isSaving}
              onChange={(event) => {
                updateField("dateOfBirth", event.target.value);
              }}
              className={inputClassName}
            />
          </label>

          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
            Tỉnh hoặc thành phố
            <input
              type="text"
              value={form.city}
              maxLength={100}
              disabled={isSaving}
              onChange={(event) => {
                updateField("city", event.target.value);
              }}
              className={inputClassName}
            />
          </label>

          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
            Giới thiệu bản thân
            <textarea
              value={form.bio}
              maxLength={500}
              rows={4}
              disabled={isSaving}
              onChange={(event) => {
                updateField("bio", event.target.value);
              }}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-400">
              {form.bio.length}/500 ký tự
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-4" />
              Hủy
            </button>

            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              <Check aria-hidden="true" className="size-4" />
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
