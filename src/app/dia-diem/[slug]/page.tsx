import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicPlaceBySlug,
  type PublicPlaceDetail,
} from "@/lib/places/public-places";

export const dynamic = "force-dynamic";

type PlaceDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ Hai",
  TUESDAY: "Thứ Ba",
  WEDNESDAY: "Thứ Tư",
  THURSDAY: "Thứ Năm",
  FRIDAY: "Thứ Sáu",
  SATURDAY: "Thứ Bảy",
  SUNDAY: "Chủ Nhật",
};

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

const PRICE_AUDIENCE_LABELS: Record<string, string> = {
  GENERAL: "Mọi đối tượng",
  ADULT: "Người lớn",
  CHILD: "Trẻ em",
  INFANT: "Em bé",
  SENIOR: "Người cao tuổi",
  STUDENT: "Học sinh / sinh viên",
  GROUP: "Nhóm",
  OTHER: "Khác",
};

function formatAddress(place: PublicPlaceDetail): string {
  return [
    place.addressLine,
    place.ward,
    place.districtName,
    place.provinceName,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatTime(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(11, 16);
}

function formatOpeningHour(
  openingHour: PublicPlaceDetail["openingHours"][number],
): string {
  if (openingHour.isClosed) {
    return openingHour.note
      ? `Đóng cửa · ${openingHour.note}`
      : "Đóng cửa";
  }

  if (openingHour.isOpen24Hours) {
    return openingHour.note
      ? `Mở cửa 24 giờ · ${openingHour.note}`
      : "Mở cửa 24 giờ";
  }

  const openTime = formatTime(openingHour.openTime);
  const closeTime = formatTime(openingHour.closeTime);

  if (openTime && closeTime) {
    const nextDayLabel = openingHour.closesNextDay
      ? " (qua ngày hôm sau)"
      : "";
    const noteLabel = openingHour.note ? ` · ${openingHour.note}` : "";

    return `${openTime} - ${closeTime}${nextDayLabel}${noteLabel}`;
  }

  return openingHour.note ?? "Đang cập nhật";
}

function formatPrice(
  price: PublicPlaceDetail["prices"][number],
): string {
  const amount = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(price.amount);
  const unitLabel = PRICE_UNIT_LABELS[price.unit] ?? "đơn vị";

  return `${amount} ${price.currency}/${unitLabel}`;
}

function formatDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(value);
}

function getSafeWebsiteUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating} trên 5 sao`}
      className="tracking-wider text-amber-500"
    >
      {"★".repeat(Math.max(0, Math.min(5, rating)))}
      <span className="text-slate-300">
        {"★".repeat(Math.max(0, 5 - rating))}
      </span>
    </span>
  );
}

export async function generateMetadata({
  params,
}: PlaceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPublicPlaceBySlug(slug);

  if (!place) {
    return {
      title: "Không tìm thấy địa điểm | VTripPlanner",
    };
  }

  return {
    title: `${place.name} | VTripPlanner`,
    description:
      place.shortDescription ??
      `Thông tin tham khảo về ${place.name} tại ${place.provinceName}.`,
  };
}

export default async function PlaceDetailPage({
  params,
}: PlaceDetailPageProps) {
  const { slug } = await params;
  const place = await getPublicPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const sortedOpeningHours = [...place.openingHours].sort((left, right) => {
    const leftDay = DAY_ORDER.indexOf(left.dayOfWeek);
    const rightDay = DAY_ORDER.indexOf(right.dayOfWeek);

    if (leftDay !== rightDay) {
      return leftDay - rightDay;
    }

    return left.periodOrder - right.periodOrder;
  });

  const websiteUrl = getSafeWebsiteUrl(place.websiteUrl);
  const hasCoordinates =
    place.latitude !== null && place.longitude !== null;
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
    : null;

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
              href="/dia-diem"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Địa điểm
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
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <nav
            aria-label="Điều hướng"
            className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-100"
          >
            <Link href="/dia-diem" className="hover:text-white">
              Địa điểm
            </Link>
            <span aria-hidden="true">/</span>
            <span>{place.provinceName}</span>
            <span aria-hidden="true">/</span>
            <span className="text-white">{place.name}</span>
          </nav>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold backdrop-blur">
                  {place.categoryName}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold backdrop-blur">
                  {place.provinceName}
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                {place.name}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-50 sm:text-lg">
                {place.shortDescription ??
                  "Thông tin địa điểm phục vụ lập lịch trình du lịch."}
              </p>
            </div>

            <div className="rounded-2xl bg-white/95 px-5 py-4 text-slate-900 shadow-lg">
              <p className="text-sm font-bold text-slate-500">
                Đánh giá cộng đồng
              </p>
              <p className="mt-1 text-2xl font-black">
                {place.averageRating === null
                  ? "Chưa có"
                  : `${place.averageRating}/5`}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {place.reviewCount === 0
                  ? "Chưa có đánh giá"
                  : `${place.reviewCount} đánh giá đã công khai`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section aria-label="Hình ảnh địa điểm">
          {place.images.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {place.images.map((image, index) => (
                <figure
                  key={`${image.url ?? "missing"}-${index}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100">
                    {image.url ? (
                      <div
                        role="img"
                        aria-label={image.alt}
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url("${image.url}")`,
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-bold text-emerald-800">
                        Ảnh địa điểm đang được cập nhật
                      </div>
                    )}
                  </div>
                  {image.caption ? (
                    <figcaption className="px-4 py-3 text-sm leading-6 text-slate-600">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
              Hình ảnh địa điểm đang được cập nhật.
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                Giới thiệu
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Về {place.name}
              </h2>
              <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-700">
                {place.description ??
                  place.shortDescription ??
                  "Nội dung mô tả chi tiết đang được cập nhật."}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                    Thời gian
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    Giờ mở cửa
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  Dữ liệu tham khảo có thể thay đổi theo thực tế.
                </p>
              </div>

              {sortedOpeningHours.length > 0 ? (
                <dl className="mt-6 divide-y divide-slate-100">
                  {sortedOpeningHours.map((openingHour) => (
                    <div
                      key={`${openingHour.dayOfWeek}-${openingHour.periodOrder}`}
                      className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-6"
                    >
                      <dt className="font-bold text-slate-900">
                        {DAY_LABELS[openingHour.dayOfWeek] ??
                          openingHour.dayOfWeek}
                      </dt>
                      <dd className="text-slate-600">
                        {formatOpeningHour(openingHour)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-600">
                  Chưa có thông tin giờ mở cửa.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                Chi phí
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Giá tham khảo
              </h2>

              {place.prices.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {place.prices.map((price) => {
                    const validFrom = formatDate(price.validFrom);
                    const validUntil = formatDate(price.validUntil);

                    return (
                      <article
                        key={price.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <p className="text-sm font-bold text-slate-600">
                          {price.label}
                        </p>
                        <p className="mt-2 text-xl font-black text-emerald-700">
                          {formatPrice(price)}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {PRICE_AUDIENCE_LABELS[price.audience] ??
                            price.audience}
                        </p>

                        {price.minimumQuantity || price.maximumQuantity ? (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            Số lượng: {price.minimumQuantity ?? "—"} đến{" "}
                            {price.maximumQuantity ?? "—"}
                          </p>
                        ) : null}

                        {validFrom || validUntil ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Hiệu lực: {validFrom ?? "không giới hạn"} –{" "}
                            {validUntil ?? "không giới hạn"}
                          </p>
                        ) : null}

                        {price.note ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {price.note}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-600">
                  Chưa có giá tham khảo cho địa điểm này.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                    Cộng đồng
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    Đánh giá
                  </h2>
                </div>
                <p className="text-sm font-bold text-slate-600">
                  {place.reviewCount} đánh giá
                </p>
              </div>

              {place.reviews.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {place.reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">
                            {review.authorName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {new Intl.DateTimeFormat("vi-VN", {
                              dateStyle: "medium",
                            }).format(review.createdAt)}
                          </p>
                        </div>
                        <RatingStars rating={review.rating} />
                      </div>

                      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                        {review.content ?? "Người dùng chỉ để lại điểm đánh giá."}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                  Chưa có đánh giá công khai cho địa điểm này.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                Thông tin nhanh
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight">
                Địa chỉ & liên hệ
              </h2>

              <dl className="mt-5 space-y-5 text-sm">
                <div>
                  <dt className="font-bold text-slate-900">Địa chỉ</dt>
                  <dd className="mt-1 leading-6 text-slate-600">
                    {formatAddress(place)}
                  </dd>
                </div>

                {hasCoordinates ? (
                  <div>
                    <dt className="font-bold text-slate-900">Tọa độ</dt>
                    <dd className="mt-1 text-slate-600">
                      {place.latitude}, {place.longitude}
                    </dd>
                    {mapUrl ? (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        Mở trên Google Maps →
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {place.phone ? (
                  <div>
                    <dt className="font-bold text-slate-900">Điện thoại</dt>
                    <dd className="mt-1">
                      <a
                        href={`tel:${place.phone}`}
                        className="text-emerald-700 hover:text-emerald-800"
                      >
                        {place.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}

                {place.email ? (
                  <div>
                    <dt className="font-bold text-slate-900">Email</dt>
                    <dd className="mt-1 break-all">
                      <a
                        href={`mailto:${place.email}`}
                        className="text-emerald-700 hover:text-emerald-800"
                      >
                        {place.email}
                      </a>
                    </dd>
                  </div>
                ) : null}

                {websiteUrl ? (
                  <div>
                    <dt className="font-bold text-slate-900">Website</dt>
                    <dd className="mt-1 break-all">
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:text-emerald-800"
                      >
                        Truy cập website →
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                Gợi ý thời điểm
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight">
                Mùa phù hợp
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {place.seasonNote ??
                  (place.bestVisitMonths.length > 0
                    ? `Các tháng phù hợp: ${place.bestVisitMonths.join(", ")}.`
                    : "Có thể cân nhắc ghé thăm quanh năm.")}
              </p>

              {place.bestVisitMonths.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {place.bestVisitMonths.map((month) => (
                    <span
                      key={month}
                      className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800"
                    >
                      Tháng {month}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <Link
              href="/dia-diem"
              className="block rounded-3xl bg-slate-900 px-6 py-5 text-center text-sm font-extrabold text-white transition hover:bg-slate-800"
            >
              ← Quay lại danh sách địa điểm
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
