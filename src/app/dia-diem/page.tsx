import type { Metadata } from "next";
import Link from "next/link";

import {
  getPublicPlaceCatalog,
  getPublicPlaceFilterOptions,
  type PublicPlaceCard,
} from "@/lib/places/public-places";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Khám phá địa điểm | VTripPlanner",
  description:
    "Tìm kiếm và lọc các địa điểm du lịch mẫu tại Thành phố Hồ Chí Minh và Đà Lạt.",
};

type PlacesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    province?: string | string[];
    category?: string | string[];
    month?: string | string[];
    page?: string | string[];
  }>;
};

type NormalizedFilters = {
  query?: string;
  province?: string;
  category?: string;
  month?: number;
  page: number;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const PRICE_UNIT_LABELS: Record<string, string> = {
  PERSON: "người",
  ENTRY: "lượt",
  HOUR: "giờ",
  DAY: "ngày",
  NIGHT: "đêm",
  ROOM: "phòng",
  VEHICLE: "xe",
  TABLE: "bàn",
  PACKAGE: "gói",
  OTHER: "đơn vị",
};

function getFirstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function normalizeFilters(
  parameters: Awaited<PlacesPageProps["searchParams"]>,
): NormalizedFilters {
  const parsedMonth = parsePositiveInteger(
    getFirstValue(parameters.month),
    0,
  );

  return {
    query: normalizeOptionalText(getFirstValue(parameters.q)),
    province: normalizeOptionalText(getFirstValue(parameters.province)),
    category: normalizeOptionalText(getFirstValue(parameters.category)),
    month:
      parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : undefined,
    page: parsePositiveInteger(getFirstValue(parameters.page), 1),
  };
}

function createCatalogHref(
  filters: NormalizedFilters,
  page: number,
): string {
  const parameters = new URLSearchParams();

  if (filters.query) {
    parameters.set("q", filters.query);
  }

  if (filters.province) {
    parameters.set("province", filters.province);
  }

  if (filters.category) {
    parameters.set("category", filters.category);
  }

  if (filters.month) {
    parameters.set("month", filters.month.toString());
  }

  if (page > 1) {
    parameters.set("page", page.toString());
  }

  const queryString = parameters.toString();

  return queryString ? `/dia-diem?${queryString}` : "/dia-diem";
}

function formatPrice(place: PublicPlaceCard): string {
  if (!place.minimumPrice) {
    return "Chưa có giá tham khảo";
  }

  const unitLabel =
    PRICE_UNIT_LABELS[place.minimumPrice.unit] ?? "đơn vị";
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(place.minimumPrice.amount);

  return `Từ ${formattedAmount} ${place.minimumPrice.currency}/${unitLabel}`;
}

function formatAddress(place: PublicPlaceCard): string {
  return [place.addressLine, place.ward, place.provinceName]
    .filter(Boolean)
    .join(", ");
}

function PlaceCard({ place }: { place: PublicPlaceCard }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100">
        {place.coverImageUrl ? (
          <div
            role="img"
            aria-label={place.coverImageAlt}
            className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-105"
            style={{
              backgroundImage: `url("${place.coverImageUrl}")`,
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-bold text-emerald-800">
            Ảnh địa điểm đang được cập nhật
          </div>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-slate-800 shadow-sm backdrop-blur">
          {place.categoryName}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              {place.provinceName}
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
              {place.name}
            </h2>
          </div>

          <div className="shrink-0 rounded-2xl bg-amber-50 px-3 py-2 text-right">
            <p className="text-sm font-black text-amber-700">
              {place.averageRating === null ? "Mới" : `${place.averageRating}/5`}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-amber-800/70">
              {place.reviewCount === 0
                ? "Chưa có đánh giá"
                : `${place.reviewCount} đánh giá`}
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">
          {place.shortDescription ??
            "Địa điểm mẫu phục vụ chức năng lập lịch trình du lịch."}
        </p>

        <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <dt className="font-bold text-slate-900">Địa chỉ</dt>
            <dd className="mt-1 leading-5 text-slate-600">
              {formatAddress(place)}
            </dd>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-bold text-slate-900">Giá tham khảo</dt>
              <dd className="mt-1 text-emerald-700">{formatPrice(place)}</dd>
            </div>

            <div>
              <dt className="font-bold text-slate-900">Thời điểm phù hợp</dt>
              <dd className="mt-1 text-slate-600">
                {place.seasonNote ??
                  (place.bestVisitMonths.length > 0
                    ? `Tháng ${place.bestVisitMonths.join(", ")}`
                    : "Quanh năm")}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </article>
  );
}

export default async function PlacesPage({ searchParams }: PlacesPageProps) {
  const parameters = await searchParams;
  const filters = normalizeFilters(parameters);

  const [catalog, options] = await Promise.all([
    getPublicPlaceCatalog(filters),
    getPublicPlaceFilterOptions(),
  ]);

  const firstResult =
    catalog.total === 0
      ? 0
      : (catalog.currentPage - 1) * catalog.pageSize + 1;
  const lastResult = Math.min(
    catalog.currentPage * catalog.pageSize,
    catalog.total,
  );
  const hasActiveFilters = Boolean(
    filters.query || filters.province || filters.category || filters.month,
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-slate-950"
          >
            VTripPlanner
          </Link>

          <nav className="flex items-center gap-2 text-sm font-bold">
            <Link
              href="/dang-nhap"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Đăng nhập
            </Link>
            <Link
              href="/tai-khoan"
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-white transition hover:bg-emerald-800"
            >
              Tài khoản
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-emerald-900/10 bg-gradient-to-br from-emerald-800 via-teal-800 to-cyan-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-emerald-100">
            Dữ liệu địa điểm
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Khám phá địa điểm cho hành trình tiếp theo
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50 sm:text-lg">
            Tìm kiếm theo tên, lọc theo tỉnh thành, danh mục và tháng phù
            hợp trước khi đưa địa điểm vào lịch trình.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form
            method="get"
            action="/dia-diem"
            className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_0.8fr_auto] lg:items-end"
          >
            <label className="block">
              <span className="text-sm font-bold text-slate-800">
                Tìm địa điểm
              </span>
              <input
                type="search"
                name="q"
                defaultValue={filters.query}
                placeholder="Ví dụ: bảo tàng, hồ, chợ..."
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-800">
                Tỉnh hoặc thành phố
              </span>
              <select
                name="province"
                defaultValue={filters.province ?? ""}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Tất cả khu vực</option>
                {options.provinces.map((province) => (
                  <option key={province.slug} value={province.slug}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-800">
                Danh mục
              </span>
              <select
                name="category"
                defaultValue={filters.category ?? ""}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Tất cả danh mục</option>
                {options.categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-800">
                Tháng đi
              </span>
              <select
                name="month"
                defaultValue={filters.month?.toString() ?? ""}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Mọi thời điểm</option>
                {MONTH_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    Tháng {month}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Tìm kiếm
            </button>
          </form>

          {hasActiveFilters ? (
            <div className="mt-4 flex justify-end">
              <Link
                href="/dia-diem"
                className="text-sm font-bold text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-emerald-700"
              >
                Xóa bộ lọc
              </Link>
            </div>
          ) : null}
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
                Danh sách địa điểm
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {catalog.total} kết quả phù hợp
              </h2>
            </div>

            <p className="text-sm text-slate-500">
              {catalog.total === 0
                ? "Không có kết quả để hiển thị"
                : `Đang hiển thị ${firstResult}-${lastResult} trên ${catalog.total}`}
            </p>
          </div>

          {catalog.places.length > 0 ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {catalog.places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="text-xl font-black text-slate-900">
                Chưa tìm thấy địa điểm phù hợp
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Hãy thử rút gọn từ khóa hoặc bỏ bớt một điều kiện lọc.
              </p>
              <Link
                href="/dia-diem"
                className="mt-6 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                Xem toàn bộ địa điểm
              </Link>
            </div>
          )}

          {catalog.totalPages > 1 ? (
            <nav
              aria-label="Phân trang địa điểm"
              className="mt-8 flex items-center justify-center gap-3"
            >
              {catalog.currentPage > 1 ? (
                <Link
                  href={createCatalogHref(filters, catalog.currentPage - 1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  Trang trước
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-400">
                  Trang trước
                </span>
              )}

              <span className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                Trang {catalog.currentPage}/{catalog.totalPages}
              </span>

              {catalog.currentPage < catalog.totalPages ? (
                <Link
                  href={createCatalogHref(filters, catalog.currentPage + 1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  Trang sau
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-400">
                  Trang sau
                </span>
              )}
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  );
}
