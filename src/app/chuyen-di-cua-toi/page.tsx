import Link from "next/link";
import { redirect } from "next/navigation";

import { SavedTripActions } from "@/components/trips/saved-trip-actions";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chuyến đi của tôi | VTripPlanner",
  description:
    "Xem lại và quản lý các lịch trình đã lưu trên VTripPlanner.",
};

const MAX_SAVED_TRIPS = 30;

const TRIP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  GENERATING: "Đang tạo",
  READY: "Sẵn sàng",
  ARCHIVED: "Đã lưu trữ",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  VISIT: "Tham quan",
  FOOD: "Ăn uống",
  TRANSFER: "Di chuyển",
  REST: "Nghỉ ngơi",
  OTHER: "Hoạt động",
};

function formatTripDate(
  date: Date | null,
): string {
  if (!date) {
    return "Chưa xác định";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatActivityTime(
  date: Date,
): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function getStatusLabel(
  status: string,
): string {
  return (
    TRIP_STATUS_LABELS[status] ??
    status
  );
}

function getActivityTypeLabel(
  type: string,
): string {
  return (
    ACTIVITY_TYPE_LABELS[type] ??
    type
  );
}

export default async function MyTripsPage() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    const message = encodeURIComponent(
      "Vui lòng đăng nhập để xem chuyến đi của bạn.",
    );

    redirect(
      `/dang-nhap?message=${message}`,
    );
  }

  const applicationUser =
    await prisma.user.findFirst({
      where: {
        id: authUser.id,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

  if (!applicationUser) {
    redirect(
      "/khong-co-quyen?reason=inactive",
    );
  }

  const trips =
    await prisma.trip.findMany({
      where: {
        ownerUserId:
          applicationUser.id,
        deletedAt: null,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          startDate: "desc",
        },
      ],
      take: MAX_SAVED_TRIPS,
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        currency: true,
        notes: true,
        createdAt: true,
        destinationProvince: {
          select: {
            name: true,
          },
        },
        days: {
          orderBy: {
            dayNumber: "asc",
          },
          select: {
            id: true,
            dayNumber: true,
            date: true,
            title: true,
            notes: true,
            activities: {
              orderBy: [
                {
                  sortOrder: "asc",
                },
                {
                  startsAt: "asc",
                },
              ],
              select: {
                id: true,
                type: true,
                title: true,
                description: true,
                startsAt: true,
                endsAt: true,
                notes: true,
                place: {
                  select: {
                    name: true,
                    addressLine: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                VTripPlanner
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Chuyến đi của tôi
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Bạn có thể đổi tên hoặc xóa chuyến đi đã lưu. Nếu muốn thay đổi ngày, địa điểm hay lịch trình, hãy tạo một chuyến đi mới.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {trips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              🧳
            </div>
            <h2 className="mt-4 text-xl font-semibold">
              Bạn chưa lưu chuyến đi nào
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              Hãy tạo một lịch trình ở trang chủ. Preview chỉ được ghi vào tài khoản khi bạn bấm “Lưu chuyến đi”.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Tạo chuyến đi
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Đang hiển thị {trips.length} chuyến đi gần nhất.
              </p>
              <Link
                href="/"
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                + Tạo chuyến đi mới
              </Link>
            </div>

            {trips.map((trip) => {
              const activityCount =
                trip.days.reduce(
                  (total, day) =>
                    total +
                    day.activities.length,
                  0,
                );

              return (
                <article
                  key={trip.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            {getStatusLabel(
                              trip.status,
                            )}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {trip
                              .destinationProvince
                              ?.name ??
                              "Chưa xác định điểm đến"}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                          {trip.title}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <span>
                            📅{" "}
                            {formatTripDate(
                              trip.startDate,
                            )}{" "}
                            →{" "}
                            {formatTripDate(
                              trip.endDate,
                            )}
                          </span>
                          <span>
                            🗓 {trip.days.length} ngày
                          </span>
                          <span>
                            📍 {activityCount} hoạt động
                          </span>
                        </div>
                      </div>

                      <SavedTripActions
                        tripId={trip.id}
                        initialTitle={trip.title}
                      />
                    </div>
                  </div>

                  <details className="group border-t border-slate-200">
                    <summary className="cursor-pointer list-none bg-slate-50 px-5 py-4 sm:px-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-700">
                          Chi tiết lịch trình
                        </span>

                        <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition group-open:text-emerald-700">
                          <span className="group-open:hidden">
                            Xem lịch trình ↓
                          </span>
                          <span className="hidden group-open:inline">
                            Thu gọn ↑
                          </span>
                        </span>
                      </div>
                    </summary>

                    <div className="bg-slate-50 p-4 pt-0 sm:p-6 sm:pt-0">
                      <div className="space-y-5">
                        {trip.days.map((day) => (
                          <section
                            key={day.id}
                            className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                  Ngày{" "}
                                  {day.dayNumber}
                                </p>
                                <h3 className="mt-1 font-semibold capitalize text-slate-950">
                                  {formatDayLabel(
                                    day.date,
                                  )}
                                </h3>
                              </div>

                              {day.notes ? (
                                <p className="max-w-lg text-xs leading-5 text-slate-500">
                                  {day.notes}
                                </p>
                              ) : null}
                            </div>

                            {day.activities
                              .length === 0 ? (
                              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                Ngày này chưa có hoạt động đã lưu.
                              </div>
                            ) : (
                              <div className="mt-4 space-y-3">
                                {day.activities.map(
                                  (activity) => (
                                    <article
                                      key={
                                        activity.id
                                      }
                                      className="rounded-2xl border border-slate-200 p-4"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                          {formatActivityTime(
                                            activity.startsAt,
                                          )}
                                          {" – "}
                                          {formatActivityTime(
                                            activity.endsAt,
                                          )}
                                        </span>

                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                          {getActivityTypeLabel(
                                            activity.type,
                                          )}
                                        </span>
                                      </div>

                                      <h4 className="mt-3 font-semibold text-slate-950">
                                        {
                                          activity.title
                                        }
                                      </h4>

                                      {activity.place ? (
                                        <p className="mt-1 text-xs text-slate-500">
                                          📍{" "}
                                          {
                                            activity
                                              .place
                                              .name
                                          }
                                          {activity
                                            .place
                                            .addressLine
                                            ? ` · ${activity.place.addressLine}`
                                            : ""}
                                        </p>
                                      ) : null}

                                      {activity.description ? (
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                          {
                                            activity.description
                                          }
                                        </p>
                                      ) : null}

                                      {activity.notes ? (
                                        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                                          {
                                            activity.notes
                                          }
                                        </p>
                                      ) : null}
                                    </article>
                                  ),
                                )}
                              </div>
                            )}
                          </section>
                        ))}
                      </div>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
