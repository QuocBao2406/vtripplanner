
"use client";

import { Building2, Send } from "lucide-react";
import { useState } from "react";

type PartnerTypeValue =
  | "HOTEL"
  | "HOMESTAY"
  | "RESORT"
  | "RESTAURANT"
  | "EATERY"
  | "CAFE"
  | "ENTERTAINMENT_VENUE"
  | "TOURIST_ATTRACTION"
  | "TRANSPORT_PROVIDER"
  | "RESCUE_SERVICE"
  | "VEHICLE_REPAIR"
  | "TRAVEL_SERVICE"
  | "OTHER";

type ApplicationStatus =
  | "NOT_APPLIED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

type ApplicationForm = {
  name: string;
  type: PartnerTypeValue;
  description: string;
  phone: string;
  email: string;
  websiteUrl: string;
  taxCode: string;
  businessLicenseUrl: string;
  status: ApplicationStatus;
};

type PartnerApplicationFormProps = {
  initialApplication: ApplicationForm;
};

type ApiResponse = {
  message?: string;
};

const PARTNER_TYPES: Array<{
  value: PartnerTypeValue;
  label: string;
}> = [
  { value: "HOTEL", label: "Khách sạn" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "RESORT", label: "Resort" },
  { value: "RESTAURANT", label: "Nhà hàng" },
  { value: "EATERY", label: "Quán ăn" },
  { value: "CAFE", label: "Quán cà phê" },
  { value: "ENTERTAINMENT_VENUE", label: "Khu vui chơi" },
  { value: "TOURIST_ATTRACTION", label: "Điểm tham quan" },
  { value: "TRANSPORT_PROVIDER", label: "Đơn vị vận chuyển" },
  { value: "RESCUE_SERVICE", label: "Dịch vụ cứu hộ" },
  { value: "VEHICLE_REPAIR", label: "Sửa chữa phương tiện" },
  { value: "TRAVEL_SERVICE", label: "Dịch vụ du lịch" },
  { value: "OTHER", label: "Khác" },
];

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

export function PartnerApplicationForm({
  initialApplication,
}: PartnerApplicationFormProps) {
  const [form, setForm] = useState(initialApplication);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.description.trim().length >= 20 &&
    form.email.trim().length > 0 &&
    !isSubmitting;

  async function submit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/partner/application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          description: form.description,
          phone: form.phone,
          email: form.email,
          websiteUrl: form.websiteUrl,
          taxCode: form.taxCode,
          businessLicenseUrl: form.businessLicenseUrl,
        }),
      });

      let payload: ApiResponse = {};

      try {
        payload = (await response.json()) as ApiResponse;
      } catch {
        payload = {};
      }

      if (response.status === 401) {
        window.location.href =
          "/dang-nhap?message=" +
          encodeURIComponent("Phiên đăng nhập đã hết hạn.");
        return;
      }

      if (!response.ok) {
        setError(
          payload.message ??
            "Không thể gửi hồ sơ Partner. Vui lòng kiểm tra lại thông tin.",
        );
        return;
      }

      window.location.reload();
    } catch {
      setError("Không thể kết nối để gửi hồ sơ Partner.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Building2 aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-sky-700">
            Hồ sơ doanh nghiệp
          </p>
          <h2 className="mt-1 text-lg font-black">
            {form.status === "PENDING"
              ? "Cập nhật hồ sơ đang chờ duyệt"
              : form.status === "REJECTED"
                ? "Chỉnh sửa và gửi lại"
                : "Thông tin đăng ký"}
          </h2>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-800"
        >
          {error}
        </p>
      ) : null}

      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Tên doanh nghiệp / dịch vụ
          <input
            value={form.name}
            maxLength={200}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                name: event.target.value,
              }));
            }}
            placeholder="Ví dụ: Khách sạn Ngôi Sao"
            className={inputClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Loại đối tác
          <select
            value={form.type}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                type: event.target.value as PartnerTypeValue,
              }));
            }}
            className={`${inputClassName} bg-white`}
          >
            {PARTNER_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Mã số thuế
          <input
            value={form.taxCode}
            maxLength={50}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                taxCode: event.target.value,
              }));
            }}
            placeholder="Không bắt buộc"
            className={inputClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Email liên hệ
          <input
            type="email"
            value={form.email}
            maxLength={320}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }));
            }}
            className={inputClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Số điện thoại
          <input
            type="tel"
            value={form.phone}
            maxLength={30}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                phone: event.target.value,
              }));
            }}
            className={inputClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Website
          <input
            type="url"
            value={form.websiteUrl}
            maxLength={2048}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                websiteUrl: event.target.value,
              }));
            }}
            placeholder="https://... (không bắt buộc)"
            className={inputClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Link giấy phép / hồ sơ pháp lý
          <input
            type="url"
            value={form.businessLicenseUrl}
            maxLength={2048}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                businessLicenseUrl: event.target.value,
              }));
            }}
            placeholder="https://... (không bắt buộc ở MVP)"
            className={inputClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Giới thiệu doanh nghiệp / dịch vụ
          <textarea
            value={form.description}
            maxLength={2000}
            rows={6}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }));
            }}
            placeholder="Mô tả loại hình kinh doanh, dịch vụ cung cấp, khu vực hoạt động..."
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
          <span className="mt-1 block text-right text-xs font-normal text-slate-400">
            {form.description.length}/2000 ký tự · tối thiểu 20 ký tự
          </span>
        </label>

        <div className="border-t border-slate-100 pt-4 sm:col-span-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send aria-hidden="true" className="size-4" />
            {isSubmitting
              ? "Đang gửi..."
              : form.status === "PENDING"
                ? "Cập nhật hồ sơ"
                : form.status === "REJECTED"
                  ? "Gửi lại để xét duyệt"
                  : "Gửi hồ sơ đăng ký"}
          </button>

          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            Gửi hồ sơ không tự cấp quyền Partner. ADMIN phải phê duyệt trước.
          </p>
        </div>
      </form>
    </section>
  );
}
