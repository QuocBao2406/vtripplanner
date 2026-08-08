
"use client";

import {
  CheckCircle2,
  Clock3,
  MapPinned,
  Pencil,
  Plus,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
};

type ProvinceOption = {
  id: string;
  name: string;
  slug: string;
  districts: Array<{
    id: string;
    name: string;
  }>;
};

type PartnerPlaceItem = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
  shortDescription: string;
  description: string;
  addressLine: string;
  ward: string;
  phone: string;
  email: string;
  websiteUrl: string;
  verificationStatus: string;
  rejectionReason: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  isActive: boolean;
  updatedAt: string;
};

type PartnerPlaceManagerProps = {
  categories: CategoryItem[];
  provinces: ProvinceOption[];
  initialPlaces: PartnerPlaceItem[];
};

type PlaceForm = {
  id: string | null;
  name: string;
  slug: string;
  categoryId: string;
  provinceId: string;
  districtId: string;
  shortDescription: string;
  description: string;
  addressLine: string;
  ward: string;
  phone: string;
  email: string;
  websiteUrl: string;
};

type ApiResponse = {
  message?: string;
};

function makeEmptyForm(
  categories: CategoryItem[],
  provinces: ProvinceOption[],
): PlaceForm {
  return {
    id: null,
    name: "",
    slug: "",
    categoryId: categories[0]?.id ?? "",
    provinceId: provinces[0]?.id ?? "",
    districtId: "",
    shortDescription: "",
    description: "",
    addressLine: "",
    ward: "",
    phone: "",
    email: "",
    websiteUrl: "",
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatTime(value: string | null): string {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function statusLabel(status: string): string {
  if (status === "VERIFIED") {
    return "Đã duyệt";
  }

  if (status === "PENDING") {
    return "Chờ ADMIN duyệt";
  }

  if (status === "REJECTED") {
    return "Cần chỉnh sửa";
  }

  if (status === "SUSPENDED") {
    return "Tạm ngưng";
  }

  return "Bản nháp";
}

function statusClassName(status: string): string {
  if (status === "VERIFIED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "PENDING") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function canEditPlace(status: string): boolean {
  return (
    status === "DRAFT" ||
    status === "PENDING" ||
    status === "REJECTED"
  );
}

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

export function PartnerPlaceManager({
  categories,
  provinces,
  initialPlaces,
}: PartnerPlaceManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState<PlaceForm>(() =>
    makeEmptyForm(categories, provinces),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEditing = Boolean(form.id);

  const selectedProvince = useMemo(
    () =>
      provinces.find(
        (province) => province.id === form.provinceId,
      ) ?? null,
    [form.provinceId, provinces],
  );

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.categoryId &&
    form.provinceId &&
    form.addressLine.trim().length >= 2 &&
    form.shortDescription.trim().length >= 10 &&
    !isSubmitting;

  function resetForm() {
    setForm(makeEmptyForm(categories, provinces));
    setMessage("");
    setError("");
  }

  function startEdit(item: PartnerPlaceItem) {
    if (!canEditPlace(item.verificationStatus)) {
      setError(
        "Địa điểm đã được duyệt hoặc tạm ngưng nên chưa hỗ trợ sửa trực tiếp trong bước này.",
      );
      setMessage("");
      return;
    }

    setForm({
      id: item.id,
      name: item.name,
      slug: item.slug,
      categoryId: item.categoryId,
      provinceId: item.provinceId,
      districtId: item.districtId,
      shortDescription: item.shortDescription,
      description: item.description,
      addressLine: item.addressLine,
      ward: item.ward,
      phone: item.phone,
      email: item.email,
      websiteUrl: item.websiteUrl,
    });
    setMessage("");
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submitForm() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/partner/places", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(form.id
            ? {
                id: form.id,
              }
            : {}),
          name: form.name,
          slug: form.slug,
          categoryId: form.categoryId,
          provinceId: form.provinceId,
          districtId: form.districtId,
          shortDescription: form.shortDescription,
          description: form.description,
          addressLine: form.addressLine,
          ward: form.ward,
          phone: form.phone,
          email: form.email,
          websiteUrl: form.websiteUrl,
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

      if (response.status === 403) {
        window.location.href = "/khong-co-quyen?required=PARTNER";
        return;
      }

      if (!response.ok) {
        setError(payload.message ?? "Không thể gửi địa điểm.");
        return;
      }

      setMessage(
        payload.message ??
          "Đã gửi địa điểm để ADMIN xét duyệt.",
      );
      setForm(makeEmptyForm(categories, provinces));
      router.refresh();
    } catch {
      setError("Không thể kết nối để gửi địa điểm.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 grid items-start gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-sky-700">
              {isEditing ? "Chỉnh sửa hồ sơ" : "Địa điểm mới"}
            </p>
            <h2 className="mt-1 text-lg font-black">
              {isEditing ? "Cập nhật và gửi lại" : "Gửi Place / dịch vụ"}
            </h2>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              aria-label="Hủy chỉnh sửa"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          Địa điểm mới sẽ ở trạng thái PENDING và tạm thời không hoạt động.
          ADMIN phải phê duyệt trước khi hệ thống có thể sử dụng địa điểm.
        </p>

        {message ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
            {error}
          </p>
        ) : null}

        {categories.length === 0 || provinces.length === 0 ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-800">
            Hệ thống chưa có đủ Danh mục hoặc Khu vực đang hoạt động. Vui lòng
            liên hệ ADMIN trước khi tạo địa điểm.
          </p>
        ) : null}

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
        >
          <label className="block text-sm font-semibold text-slate-700">
            Tên địa điểm / dịch vụ
            <input
              value={form.name}
              maxLength={200}
              onChange={(event) => {
                const name = event.target.value;

                setForm((current) => ({
                  ...current,
                  name,
                  slug:
                    current.id || current.slug
                      ? current.slug
                      : slugify(name),
                }));
              }}
              placeholder="Ví dụ: Khách sạn Ngôi Sao"
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Slug
            <input
              value={form.slug}
              maxLength={220}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  slug: slugify(event.target.value),
                }));
              }}
              placeholder="khach-san-ngoi-sao"
              className={`${inputClassName} font-mono`}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Danh mục
              <select
                value={form.categoryId}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }));
                }}
                className={inputClassName}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Khu vực
              <select
                value={form.provinceId}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    provinceId: event.target.value,
                    districtId: "",
                  }));
                }}
                className={inputClassName}
              >
                <option value="">Chọn khu vực</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Quận / huyện
            <select
              value={form.districtId}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  districtId: event.target.value,
                }));
              }}
              disabled={!selectedProvince}
              className={`${inputClassName} disabled:bg-slate-100`}
            >
              <option value="">Không chọn / chưa có dữ liệu</option>
              {selectedProvince?.districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Địa chỉ
            <input
              value={form.addressLine}
              maxLength={255}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  addressLine: event.target.value,
                }));
              }}
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Phường / xã
            <input
              value={form.ward}
              maxLength={100}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  ward: event.target.value,
                }));
              }}
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Mô tả ngắn
            <textarea
              value={form.shortDescription}
              maxLength={500}
              rows={3}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  shortDescription: event.target.value,
                }));
              }}
              placeholder="Tối thiểu 10 ký tự để ADMIN hiểu địa điểm/dịch vụ."
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">
              Thông tin bổ sung
            </summary>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Mô tả chi tiết
                <textarea
                  value={form.description}
                  maxLength={5000}
                  rows={5}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 outline-none"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Điện thoại
                <input
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

              <label className="block text-sm font-semibold text-slate-700">
                Email
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

              <label className="block text-sm font-semibold text-slate-700">
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
                  placeholder="https://..."
                  className={inputClassName}
                />
              </label>
            </div>
          </details>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isEditing ? (
              <Send aria-hidden="true" className="size-4" />
            ) : (
              <Plus aria-hidden="true" className="size-4" />
            )}
            {isSubmitting
              ? "Đang gửi..."
              : isEditing
                ? "Cập nhật & gửi lại"
                : "Gửi ADMIN xét duyệt"}
          </button>
        </form>
      </section>

      <section>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-sky-700">
            Địa điểm của Partner
          </p>
          <h2 className="mt-1 text-lg font-black">
            {initialPlaces.length.toLocaleString("vi-VN")} hồ sơ
          </h2>
        </div>

        {initialPlaces.length > 0 ? (
          <div className="mt-3 space-y-3">
            {initialPlaces.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPinned
                        aria-hidden="true"
                        className="size-4 text-sky-600"
                      />
                      <h3 className="font-black text-slate-950">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusClassName(
                          item.verificationStatus,
                        )}`}
                      >
                        {statusLabel(item.verificationStatus)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.categoryName} · {item.provinceName}
                      {item.districtName
                        ? ` · ${item.districtName}`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {item.addressLine}
                    </p>

                    {item.shortDescription ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {item.shortDescription}
                      </p>
                    ) : null}

                    {item.rejectionReason ? (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
                        <TriangleAlert
                          aria-hidden="true"
                          className="mt-0.5 size-3.5 shrink-0"
                        />
                        <span>
                          ADMIN yêu cầu: {item.rejectionReason}
                        </span>
                      </p>
                    ) : null}

                    <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <Clock3 aria-hidden="true" className="size-3.5" />
                      Gửi: {formatTime(item.submittedAt)}
                      {item.reviewedAt
                        ? ` · Xét duyệt: ${formatTime(item.reviewedAt)}`
                        : ""}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {canEditPlace(item.verificationStatus) ? (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          startEdit(item);
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        {item.verificationStatus === "REJECTED"
                          ? "Sửa & gửi lại"
                          : "Cập nhật"}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2
                          aria-hidden="true"
                          className="size-4"
                        />
                        {item.verificationStatus === "VERIFIED"
                          ? "Đã được duyệt"
                          : statusLabel(item.verificationStatus)}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có địa điểm nào được gửi.
          </div>
        )}
      </section>
    </div>
  );
}
