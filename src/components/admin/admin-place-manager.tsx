
"use client";

import {
  Check,
  MapPinned,
  Pencil,
  Plus,
  Trash2,
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
  isActive: boolean;
  districts: Array<{
    id: string;
    name: string;
  }>;
};

type PlaceItem = {
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
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  websiteUrl: string;
  verificationStatus: string;
  isActive: boolean;
  partnerName: string;
  updatedAt: string;
};

type AdminPlaceManagerProps = {
  categories: CategoryItem[];
  provinces: ProvinceOption[];
  initialPlaces: PlaceItem[];
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
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  websiteUrl: string;
  isActive: boolean;
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
    provinceId:
      provinces.find((province) => province.isActive)?.id ?? "",
    districtId: "",
    shortDescription: "",
    description: "",
    addressLine: "",
    ward: "",
    latitude: "",
    longitude: "",
    phone: "",
    email: "",
    websiteUrl: "",
    isActive: true,
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

export function AdminPlaceManager({
  categories,
  provinces,
  initialPlaces,
}: AdminPlaceManagerProps) {
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
    !isSubmitting;

  function resetForm() {
    setForm(makeEmptyForm(categories, provinces));
    setMessage("");
    setError("");
  }

  function startEdit(item: PlaceItem) {
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
      latitude: item.latitude,
      longitude: item.longitude,
      phone: item.phone,
      email: item.email,
      websiteUrl: item.websiteUrl,
      isActive: item.isActive,
    });
    setMessage("");
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function readPayload(response: Response): Promise<ApiResponse> {
    try {
      return (await response.json()) as ApiResponse;
    } catch {
      return {};
    }
  }

  async function submitForm() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/places", {
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
          latitude: form.latitude,
          longitude: form.longitude,
          phone: form.phone,
          email: form.email,
          websiteUrl: form.websiteUrl,
          isActive: form.isActive,
        }),
      });

      const payload = await readPayload(response);

      if (!response.ok) {
        setError(payload.message ?? "Không thể lưu địa điểm.");
        return;
      }

      setMessage(
        payload.message ??
          (isEditing
            ? "Đã cập nhật địa điểm."
            : "Đã tạo địa điểm."),
      );
      setForm(makeEmptyForm(categories, provinces));
      router.refresh();
    } catch {
      setError("Không thể kết nối để lưu địa điểm.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(item: PlaceItem) {
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/places", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
          latitude: item.latitude,
          longitude: item.longitude,
          phone: item.phone,
          email: item.email,
          websiteUrl: item.websiteUrl,
          isActive: !item.isActive,
        }),
      });

      const payload = await readPayload(response);

      if (!response.ok) {
        setError(payload.message ?? "Không thể đổi trạng thái địa điểm.");
        return;
      }

      setMessage(
        item.isActive
          ? `Đã tạm ẩn ${item.name}.`
          : `Đã kích hoạt ${item.name}.`,
      );
      router.refresh();
    } catch {
      setError("Không thể kết nối để đổi trạng thái địa điểm.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function softDelete(item: PlaceItem) {
    if (
      !window.confirm(
        `Xóa mềm "${item.name}"? Địa điểm sẽ không còn tham gia gợi ý Trip Planner.`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/places", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
        }),
      });

      const payload = await readPayload(response);

      if (!response.ok) {
        setError(payload.message ?? "Không thể xóa địa điểm.");
        return;
      }

      setMessage(payload.message ?? "Đã xóa mềm địa điểm.");
      resetForm();
      router.refresh();
    } catch {
      setError("Không thể kết nối để xóa địa điểm.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
      <section className="self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">
              {isEditing ? "Chỉnh sửa" : "Thêm mới"}
            </p>
            <h2 className="mt-1 text-lg font-black">
              {isEditing ? "Cập nhật địa điểm" : "Tạo Place / POI"}
            </h2>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Hủy chỉnh sửa"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
            {error}
          </p>
        ) : null}

        {categories.length === 0 ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800">
            Chưa có PlaceCategory đang hoạt động. Hãy seed/import danh mục
            trước khi tạo địa điểm.
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
            Tên địa điểm
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
              placeholder="Ví dụ: Bãi Sau"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
              placeholder="bai-sau-vung-tau"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500"
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
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-500"
              >
                <option value="">Chọn khu vực</option>
                {provinces
                  .filter((province) => province.isActive)
                  .map((province) => (
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
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none disabled:bg-slate-100"
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
              placeholder="Địa chỉ hoặc khu vực cụ thể"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </label>
<label className="block text-sm font-semibold text-slate-700">
            Mô tả ngắn
            <textarea
              value={form.shortDescription}
              maxLength={500}
              rows={2}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  shortDescription: event.target.value,
                }));
              }}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none"
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
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none"
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
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none"
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
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none"
                />
              </label>
            </div>
          </details>

          <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }));
              }}
              className="size-4"
            />
            Cho phép địa điểm tham gia gợi ý
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isEditing ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Plus aria-hidden="true" className="size-4" />
            )}
            {isSubmitting
              ? "Đang lưu..."
              : isEditing
                ? "Lưu thay đổi"
                : "Tạo địa điểm"}
          </button>
        </form>
      </section>

      <section>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">
            Database
          </p>
          <h2 className="mt-1 text-lg font-black">
            {initialPlaces.length.toLocaleString("vi-VN")} địa điểm gần nhất
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Hiển thị tối đa 100 Place chưa bị xóa mềm.
          </p>
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
                        className="size-4 text-violet-600"
                      />
                      <h3 className="font-bold text-slate-950">
                        {item.name}
                      </h3>

                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                        {item.verificationStatus}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          item.isActive
                            ? "bg-sky-50 text-sky-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.isActive ? "Đang dùng" : "Tạm ẩn"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {item.categoryName} · {item.provinceName}
                      {item.districtName
                        ? ` · ${item.districtName}`
                        : ""}
                    </p>

                    <p className="mt-2 text-sm text-slate-700">
                      {item.addressLine}
                    </p>

                    {item.shortDescription ? (
                      <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
                        {item.shortDescription}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs text-slate-400">
                      /{item.slug}
                      {item.partnerName
                        ? ` · Partner: ${item.partnerName}`
                        : " · Nguồn hệ thống/Admin"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        startEdit(item);
                      }}
                      disabled={isSubmitting}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Pencil aria-hidden="true" className="size-3.5" />
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void toggleActive(item);
                      }}
                      disabled={isSubmitting}
                      className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {item.isActive ? "Tạm ẩn" : "Kích hoạt"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void softDelete(item);
                      }}
                      disabled={isSubmitting}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-100 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      Xóa mềm
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có địa điểm nào.
          </div>
        )}
      </section>
    </div>
  );
}
