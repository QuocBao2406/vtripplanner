
"use client";

import {
  Check,
  Map,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ProvinceItem = {
  id: string;
  name: string;
  code: string;
  slug: string;
  isActive: boolean;
  updatedAt: string;
  districtCount: number;
  placeCount: number;
  tripCount: number;
};

type AdminProvinceManagerProps = {
  initialProvinces: ProvinceItem[];
};

type ProvinceForm = {
  id: string | null;
  name: string;
  code: string;
  slug: string;
  isActive: boolean;
};

type ApiResponse = {
  message?: string;
};

const emptyForm: ProvinceForm = {
  id: null,
  name: "",
  code: "",
  slug: "",
  isActive: true,
};

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

function codeFromName(value: string): string {
  return slugify(value)
    .replaceAll("-", "_")
    .toUpperCase()
    .slice(0, 20);
}

export function AdminProvinceManager({
  initialProvinces,
}: AdminProvinceManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProvinceForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEditing = Boolean(form.id);

  const canSubmit = useMemo(
    () =>
      form.name.trim().length >= 2 &&
      form.code.trim().length > 0 &&
      form.slug.trim().length > 0 &&
      !isSubmitting,
    [form, isSubmitting],
  );

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function startEdit(item: ProvinceItem) {
    setForm({
      id: item.id,
      name: item.name,
      code: item.code,
      slug: item.slug,
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
      const response = await fetch("/api/admin/provinces", {
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
          code: form.code,
          slug: form.slug,
          isActive: form.isActive,
        }),
      });

      const payload = await readPayload(response);

      if (!response.ok) {
        setError(payload.message ?? "Không thể lưu khu vực.");
        return;
      }

      setMessage(
        payload.message ??
          (isEditing
            ? "Đã cập nhật khu vực."
            : "Đã tạo khu vực."),
      );
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("Không thể kết nối để lưu khu vực.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(item: ProvinceItem) {
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/provinces", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          code: item.code,
          slug: item.slug,
          isActive: !item.isActive,
        }),
      });

      const payload = await readPayload(response);

      if (!response.ok) {
        setError(payload.message ?? "Không thể đổi trạng thái khu vực.");
        return;
      }

      setMessage(
        item.isActive
          ? `Đã tạm ẩn ${item.name}.`
          : `Đã kích hoạt ${item.name}.`,
      );
      router.refresh();
    } catch {
      setError("Không thể kết nối để đổi trạng thái khu vực.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteProvince(item: ProvinceItem) {
    const referenceCount =
      item.districtCount + item.placeCount + item.tripCount;

    if (referenceCount > 0) {
      setError(
        `${item.name} đang được dữ liệu khác sử dụng. Hãy chọn Tạm ẩn thay vì xóa.`,
      );
      setMessage("");
      return;
    }

    if (
      !window.confirm(
        `Xóa khu vực "${item.name}"? Hành động này chỉ dùng cho khu vực chưa được tham chiếu.`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/provinces", {
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
        setError(payload.message ?? "Không thể xóa khu vực.");
        return;
      }

      setMessage(payload.message ?? "Đã xóa khu vực.");
      router.refresh();
    } catch {
      setError("Không thể kết nối để xóa khu vực.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section className="self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">
              {isEditing ? "Chỉnh sửa" : "Thêm mới"}
            </p>
            <h2 className="mt-1 text-lg font-black">
              {isEditing ? "Cập nhật khu vực" : "Tạo khu vực du lịch"}
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

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
        >
          <label className="block text-sm font-semibold text-slate-700">
            Tên khu vực
            <input
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;

                setForm((current) => ({
                  ...current,
                  name,
                  code:
                    current.id || current.code
                      ? current.code
                      : codeFromName(name),
                  slug:
                    current.id || current.slug
                      ? current.slug
                      : slugify(name),
                }));
              }}
              maxLength={100}
              placeholder="Ví dụ: Vũng Tàu"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Mã khu vực
            <input
              value={form.code}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  code: event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9_]+/g, "_")
                    .slice(0, 20),
                }));
              }}
              maxLength={20}
              placeholder="VUNG_TAU"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Slug
            <input
              value={form.slug}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  slug: slugify(event.target.value),
                }));
              }}
              maxLength={120}
              placeholder="vung-tau"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </label>

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
            Cho phép sử dụng làm điểm đến
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
                : "Tạo khu vực"}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">
              Database
            </p>
            <h2 className="mt-1 text-lg font-black">
              {initialProvinces.length.toLocaleString("vi-VN")} khu vực
            </h2>
          </div>
        </div>

        {initialProvinces.length > 0 ? (
          <div className="mt-3 space-y-3">
            {initialProvinces.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Map
                        aria-hidden="true"
                        className="size-4 text-violet-600"
                      />
                      <h3 className="font-bold text-slate-950">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.isActive ? "Đang dùng" : "Tạm ẩn"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.code} · /{item.slug}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-lg bg-slate-50 px-2 py-1">
                        {item.placeCount} địa điểm
                      </span>
                      <span className="rounded-lg bg-slate-50 px-2 py-1">
                        {item.districtCount} quận/huyện
                      </span>
                      <span className="rounded-lg bg-slate-50 px-2 py-1">
                        {item.tripCount} chuyến đi
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                        void deleteProvince(item);
                      }}
                      disabled={isSubmitting}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-100 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có khu vực nào.
          </div>
        )}
      </section>
    </div>
  );
}
