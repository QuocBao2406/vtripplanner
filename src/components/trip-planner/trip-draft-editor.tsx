"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isStoredTripDraft,
  MAX_DRAFT_ACTIVITIES_PER_DAY,
  toTripDraftDayInputs,
  TRIP_DRAFT_STORAGE_KEY,
  type StoredTripDraft,
  type TripDraftActivity,
  type TripDraftBudgetEstimate,
  type TripDraftDay,
  type TripDraftPlaceOption,
  type TripDraftPlan,
} from "@/lib/trip-planner/draft-itinerary";

const SLOT_TEMPLATES = [
  {
    slot: "MORNING" as const,
    slotLabel: "Buổi sáng",
    time: "08:30",
    minutes: 8 * 60 + 30,
    latestMinutes: 11 * 60,
  },
  {
    slot: "AFTERNOON" as const,
    slotLabel: "Buổi chiều",
    time: "14:00",
    minutes: 14 * 60,
    latestMinutes: 16 * 60 + 30,
  },
  {
    slot: "EVENING" as const,
    slotLabel: "Buổi tối",
    time: "19:00",
    minutes: 19 * 60,
    latestMinutes: 20 * 60 + 30,
  },
];

type DraftOptionsResponse = {
  ok?: boolean;
  options?: TripDraftPlaceOption[];
  message?: string;
};

type SaveDraftResponse = {
  ok?: boolean;
  savedTrip?: {
    id: string;
    title: string;
    dayCount: number;
    activityCount: number;
  };
  message?: string;
};

type ReplacementTarget = {
  dayIndex: number;
  activityIndex: number;
} | null;

function roundMoney(amount: number): number {
  return Math.max(
    0,
    Math.round(amount / 1000) * 1000,
  );
}

function formatMoney(
  amount: number,
  currency = "VND",
): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTravelDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function getSlotBadgeClass(
  slot: TripDraftActivity["slot"],
): string {
  if (slot === "MORNING") {
    return "bg-amber-50 text-amber-700";
  }

  if (slot === "AFTERNOON") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-indigo-50 text-indigo-700";
}

function getVietnamReadyState(
  plan: TripDraftPlan,
): {
  dateKey: string;
  minutes: number;
} | null {
  if (!plan.travelEstimate) {
    return null;
  }

  const arrival = new Date(
    plan.travelEstimate.arrivalAt,
  );

  if (Number.isNaN(arrival.getTime())) {
    return null;
  }

  const readyAt = new Date(
    arrival.getTime() + 60 * 60 * 1000,
  );
  const vietnamClock = new Date(
    readyAt.getTime() + 7 * 60 * 60 * 1000,
  );

  return {
    dateKey: `${vietnamClock.getUTCFullYear()}-${String(
      vietnamClock.getUTCMonth() + 1,
    ).padStart(2, "0")}-${String(
      vietnamClock.getUTCDate(),
    ).padStart(2, "0")}`,
    minutes:
      vietnamClock.getUTCHours() * 60 +
      vietnamClock.getUTCMinutes(),
  };
}

function getAllowedSlots(
  plan: TripDraftPlan,
  dateKey: string,
) {
  const readyState = getVietnamReadyState(plan);

  if (!readyState || dateKey > readyState.dateKey) {
    return SLOT_TEMPLATES;
  }

  if (dateKey < readyState.dateKey) {
    return [];
  }

  const readyMinutes =
    Math.ceil(readyState.minutes / 30) * 30;

  return SLOT_TEMPLATES.flatMap((slot) => {
    const minutes = Math.max(
      slot.minutes,
      readyMinutes,
    );

    if (minutes > slot.latestMinutes) {
      return [];
    }

    return [
      {
        ...slot,
        minutes,
        time: `${String(
          Math.floor(minutes / 60),
        ).padStart(2, "0")}:${String(
          minutes % 60,
        ).padStart(2, "0")}`,
      },
    ];
  });
}

function recalculateBudget(
  plan: TripDraftPlan,
  days: TripDraftDay[],
): TripDraftBudgetEstimate {
  const activityCost = roundMoney(
    days
      .flatMap((day) => day.activities)
      .reduce(
        (total, activity) =>
          total +
          Math.max(0, activity.entryPrice) *
            plan.travelerCount,
        0,
      ),
  );
  const plannedCost = roundMoney(
    plan.budgetEstimate.transportCost +
      plan.budgetEstimate.accommodationCost +
      plan.budgetEstimate.foodCost +
      activityCost,
  );
  const remaining =
    plan.totalBudget -
    plannedCost -
    plan.budgetEstimate.reserveAmount;
  const remainingAfterReserve =
    Math.round(remaining / 1000) * 1000;

  return {
    ...plan.budgetEstimate,
    activityCost,
    plannedCost,
    remainingAfterReserve,
    isOverBudget: remainingAfterReserve < 0,
  };
}

function optionToActivity(
  option: TripDraftPlaceOption,
  schedule: Pick<
    TripDraftActivity,
    "slot" | "slotLabel" | "time"
  >,
): TripDraftActivity {
  return {
    ...schedule,
    placeId: option.placeId,
    placeName: option.placeName,
    categoryName: option.categoryName,
    addressLine: option.addressLine,
    provinceName: option.provinceName,
    imageUrl: option.imageUrl,
    shortDescription: option.shortDescription,
    seasonNote: option.seasonNote,
    entryPrice: option.entryPrice,
    currency: option.currency,
    score: option.score,
    reasons: option.reasons,
    openingNote:
      "Sẽ được backend kiểm tra lại giờ mở cửa khi xác nhận lưu.",
    distanceFromPreviousKm: null,
  };
}

export function TripDraftEditor() {
  const router = useRouter();
  const [draft, setDraft] =
    useState<StoredTripDraft | null>(null);
  const [days, setDays] = useState<TripDraftDay[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [options, setOptions] =
    useState<TripDraftPlaceOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] =
    useState(true);
  const [optionsMessage, setOptionsMessage] =
    useState("");
  const [replacementTarget, setReplacementTarget] =
    useState<ReplacementTarget>(null);
  const [addSelectionByDay, setAddSelectionByDay] =
    useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedTripId, setSavedTripId] =
    useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(
          TRIP_DRAFT_STORAGE_KEY,
        );

        if (!raw) {
          return;
        }

        const parsed: unknown = JSON.parse(raw);

        if (!isStoredTripDraft(parsed)) {
          sessionStorage.removeItem(
            TRIP_DRAFT_STORAGE_KEY,
          );
          return;
        }

        setDraft(parsed);
        setDays(parsed.plan.days);
      } catch {
        sessionStorage.removeItem(
          TRIP_DRAFT_STORAGE_KEY,
        );
      } finally {
        setIsHydrating(false);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!draft) {
      return;
    }

    const activeDraft = draft;
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const response = await fetch(
          "/api/trip-planner/draft-options",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              origin: activeDraft.plan.origin,
              destination: activeDraft.plan.destination,
              startDate: activeDraft.plan.startDate,
              departureTime: activeDraft.plan.departureTime,
              transportMode: activeDraft.plan.transportMode,
              duration: activeDraft.plan.duration,
              travelerCount: activeDraft.plan.travelerCount,
              totalBudget: activeDraft.plan.totalBudget,
              interests: activeDraft.plan.interests,
            }),
          },
        );
        const payload =
          (await response.json()) as DraftOptionsResponse;

        if (!response.ok || !payload.options) {
          setOptionsMessage(
            payload.message ??
              "Không thể tải địa điểm thay thế.",
          );
          return;
        }

        setOptions(payload.options);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setOptionsMessage(
          "Không thể kết nối để tải địa điểm thay thế.",
        );
      } finally {
        setIsLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => controller.abort();
  }, [draft]);

  const usedPlaceIds = useMemo(
    () =>
      new Set(
        days.flatMap((day) =>
          day.activities.map(
            (activity) => activity.placeId,
          ),
        ),
      ),
    [days],
  );

  const budgetEstimate = useMemo(
    () =>
      draft
        ? recalculateBudget(draft.plan, days)
        : null,
    [draft, days],
  );

  const totalActivities = useMemo(
    () =>
      days.reduce(
        (total, day) =>
          total + day.activities.length,
        0,
      ),
    [days],
  );

  function persistDays(nextDays: TripDraftDay[]) {
    setDays(nextDays);

    if (!draft) {
      return;
    }

    const nextDraft: StoredTripDraft = {
      ...draft,
      storedAt: new Date().toISOString(),
      plan: {
        ...draft.plan,
        days: nextDays,
      },
    };

    sessionStorage.setItem(
      TRIP_DRAFT_STORAGE_KEY,
      JSON.stringify(nextDraft),
    );
  }

  function moveActivity(
    dayIndex: number,
    activityIndex: number,
    direction: -1 | 1,
  ) {
    const targetIndex = activityIndex + direction;
    const day = days[dayIndex];

    if (
      !day ||
      targetIndex < 0 ||
      targetIndex >= day.activities.length
    ) {
      return;
    }

    const current = day.activities[activityIndex];
    const target = day.activities[targetIndex];
    const currentSchedule = {
      slot: current.slot,
      slotLabel: current.slotLabel,
      time: current.time,
    };
    const targetSchedule = {
      slot: target.slot,
      slotLabel: target.slotLabel,
      time: target.time,
    };
    const nextActivities = day.activities.map(
      (activity, index) => {
        if (index === activityIndex) {
          return {
            ...target,
            ...currentSchedule,
            openingNote:
              "Sẽ được backend kiểm tra lại sau khi đổi thứ tự.",
            distanceFromPreviousKm: null,
          };
        }

        if (index === targetIndex) {
          return {
            ...current,
            ...targetSchedule,
            openingNote:
              "Sẽ được backend kiểm tra lại sau khi đổi thứ tự.",
            distanceFromPreviousKm: null,
          };
        }

        return activity;
      },
    );
    const nextDays = days.map((item, index) =>
      index === dayIndex
        ? {
            ...item,
            activities: nextActivities,
          }
        : item,
    );

    persistDays(nextDays);
  }

  function removeActivity(
    dayIndex: number,
    activityIndex: number,
  ) {
    const nextDays = days.map((day, index) =>
      index === dayIndex
        ? {
            ...day,
            activities: day.activities.filter(
              (_, indexToKeep) =>
                indexToKeep !== activityIndex,
            ),
          }
        : day,
    );

    persistDays(nextDays);
    setReplacementTarget(null);
  }

  function replaceActivity(
    optionId: string,
  ) {
    if (!replacementTarget) {
      return;
    }

    const option = options.find(
      (candidate) => candidate.placeId === optionId,
    );
    const day = days[replacementTarget.dayIndex];
    const current =
      day?.activities[replacementTarget.activityIndex];

    if (!option || !current) {
      return;
    }

    if (
      usedPlaceIds.has(option.placeId) &&
      option.placeId !== current.placeId
    ) {
      setOptionsMessage(
        "Địa điểm này đã có trong draft.",
      );
      return;
    }

    const nextDays = days.map((item, dayIndex) =>
      dayIndex === replacementTarget.dayIndex
        ? {
            ...item,
            activities: item.activities.map(
              (activity, activityIndex) =>
                activityIndex ===
                replacementTarget.activityIndex
                  ? optionToActivity(option, {
                      slot: activity.slot,
                      slotLabel: activity.slotLabel,
                      time: activity.time,
                    })
                  : activity,
            ),
          }
        : item,
    );

    persistDays(nextDays);
    setReplacementTarget(null);
    setOptionsMessage("");
  }

  function addActivity(
    dayIndex: number,
  ) {
    if (!draft) {
      return;
    }

    const day = days[dayIndex];
    const optionId =
      addSelectionByDay[day.dayNumber] ?? "";
    const option = options.find(
      (candidate) => candidate.placeId === optionId,
    );

    if (!option) {
      setOptionsMessage(
        "Hãy chọn địa điểm muốn thêm.",
      );
      return;
    }

    if (usedPlaceIds.has(option.placeId)) {
      setOptionsMessage(
        "Địa điểm này đã có trong draft.",
      );
      return;
    }

    const allowedSlots = getAllowedSlots(
      draft.plan,
      day.date,
    );
    const usedTimes = new Set(
      day.activities.map((activity) => activity.time),
    );
    const nextSlot = allowedSlots.find(
      (slot) => !usedTimes.has(slot.time),
    );

    if (
      day.activities.length >=
        MAX_DRAFT_ACTIVITIES_PER_DAY ||
      !nextSlot
    ) {
      setOptionsMessage(
        "Ngày này không còn khung giờ trống phù hợp với ETA hiện tại.",
      );
      return;
    }

    const nextActivity = optionToActivity(
      option,
      {
        slot: nextSlot.slot,
        slotLabel: nextSlot.slotLabel,
        time: nextSlot.time,
      },
    );
    const slotOrder = new Map(
      allowedSlots.map((slot, index) => [
        slot.time,
        index,
      ]),
    );
    const nextDays = days.map((item, index) =>
      index === dayIndex
        ? {
            ...item,
            activities: [
              ...item.activities,
              nextActivity,
            ].sort(
              (left, right) =>
                (slotOrder.get(left.time) ?? 99) -
                (slotOrder.get(right.time) ?? 99),
            ),
          }
        : item,
    );

    persistDays(nextDays);
    setAddSelectionByDay((current) => ({
      ...current,
      [day.dayNumber]: "",
    }));
    setOptionsMessage("");
  }

  function startAgain() {
    sessionStorage.removeItem(
      TRIP_DRAFT_STORAGE_KEY,
    );
    router.push("/lap-lich-trinh");
  }

  async function saveDraft() {
    if (
      !draft ||
      isSaving ||
      savedTripId ||
      totalActivities < 1
    ) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(
        "/api/trip-planner/save",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin: draft.plan.origin,
            destination: draft.plan.destination,
            startDate: draft.plan.startDate,
            departureTime: draft.plan.departureTime,
            transportMode: draft.plan.transportMode,
            duration: draft.plan.duration,
            travelerCount: draft.plan.travelerCount,
            totalBudget: draft.plan.totalBudget,
            interests: draft.plan.interests,
            draftDays: toTripDraftDayInputs(days),
          }),
        },
      );

      if (response.status === 401) {
        router.push(
          "/dang-nhap?message=" +
            encodeURIComponent(
              "Vui lòng đăng nhập để xác nhận lưu draft lịch trình.",
            ),
        );
        return;
      }

      if (response.status === 403) {
        router.push(
          "/khong-co-quyen?reason=inactive",
        );
        return;
      }

      const payload =
        (await response.json()) as SaveDraftResponse;

      if (!response.ok || !payload.savedTrip) {
        setSaveMessage(
          payload.message ??
            "Không thể lưu draft. Hãy kiểm tra lại địa điểm và khung giờ.",
        );
        return;
      }

      setSavedTripId(payload.savedTrip.id);
      setSaveMessage(
        `Đã lưu “${payload.savedTrip.title}” với ${payload.savedTrip.activityCount} hoạt động.`,
      );
      sessionStorage.removeItem(
        TRIP_DRAFT_STORAGE_KEY,
      );
    } catch {
      setSaveMessage(
        "Không thể kết nối để lưu draft lúc này.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isHydrating) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Đang mở draft lịch trình...
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
        <h2 className="text-lg font-bold">
          Chưa có draft để tùy chỉnh
        </h2>
        <p className="mt-2 text-sm leading-6">
          Hãy tạo preview ở Trip Planner trước. Draft chỉ được giữ trong tab
          trình duyệt hiện tại và chưa tạo dữ liệu Trip trong database.
        </p>
        <Link
          href="/lap-lich-trinh"
          className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          ← Tạo lịch trình
        </Link>
      </div>
    );
  }

  const availableOptions = options.filter(
    (option) => !usedPlaceIds.has(option.placeId),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Draft itinerary
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {draft.plan.origin} → {draft.plan.destination}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {draft.plan.duration} ngày · {draft.plan.travelerCount} người ·{" "}
              {formatMoney(draft.plan.totalBudget)}
            </p>
          </div>

          <button
            type="button"
            onClick={startAgain}
            className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Tạo lại từ đầu
          </button>
        </div>

        {draft.plan.travelEstimate ? (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  🔒 Di chuyển hệ thống
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  Khởi hành {formatTravelDateTime(
                    draft.plan.travelEstimate.departureAt,
                  )} · dự kiến đến {formatTravelDateTime(
                    draft.plan.travelEstimate.arrivalAt,
                  )}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                Không chỉnh sửa
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {budgetEstimate ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Dự toán sau chỉnh sửa
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">
                {formatMoney(budgetEstimate.plannedCost)} /{" "}
                {formatMoney(draft.plan.totalBudget)}
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                budgetEstimate.isOverBudget
                  ? "bg-red-100 text-red-700"
                  : "bg-white text-emerald-700"
              }`}
            >
              {budgetEstimate.isOverBudget
                ? "Vượt ngân sách"
                : "Trong ngân sách"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Di chuyển", budgetEstimate.transportCost],
              ["Lưu trú", budgetEstimate.accommodationCost],
              ["Ăn uống", budgetEstimate.foodCost],
              ["Hoạt động", budgetEstimate.activityCost],
              ["Dự phòng 10%", budgetEstimate.reserveAmount],
            ].map(([label, amount]) => (
              <div
                key={String(label)}
                className="rounded-xl bg-white p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {formatMoney(Number(amount))}
                </p>
              </div>
            ))}
          </div>

          <p
            className={`mt-4 text-sm font-semibold ${
              budgetEstimate.isOverBudget
                ? "text-red-700"
                : "text-emerald-800"
            }`}
          >
            {budgetEstimate.isOverBudget ? "Vượt " : "Còn lại "}
            {formatMoney(
              Math.abs(
                budgetEstimate.remainingAfterReserve,
              ),
            )}{" "}
            sau dự phòng.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Khi chỉnh draft, client cập nhật ngay phí hoạt động và tổng ngân
            sách. Backend sẽ tính lại cả khoảng cách nội bộ, openingHours và
            snapshot chi phí khi bạn xác nhận lưu.
          </p>
        </section>
      ) : null}

      {optionsMessage ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {optionsMessage}
        </p>
      ) : null}

      <div className="space-y-5">
        {days.map((day, dayIndex) => {
          const allowedSlots = getAllowedSlots(
            draft.plan,
            day.date,
          );
          const usedTimes = new Set(
            day.activities.map((activity) => activity.time),
          );
          const hasFreeSlot = allowedSlots.some(
            (slot) => !usedTimes.has(slot.time),
          );
          const canAdd =
            day.activities.length <
              MAX_DRAFT_ACTIVITIES_PER_DAY &&
            hasFreeSlot;

          return (
            <section
              key={day.date}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-700">
                    NGÀY {day.dayNumber}
                  </p>
                  <h3 className="mt-1 font-bold capitalize text-slate-950">
                    {day.dateLabel}
                  </h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {day.activities.length}/3 hoạt động
                </span>
              </div>

              {day.activities.length === 3 ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  ⚠ Ngày này đã đủ 3 khung hoạt động; thêm tiếp sẽ làm lịch quá dày.
                </p>
              ) : null}

              <div className="mt-4 space-y-3">
                {day.activities.map(
                  (activity, activityIndex) => {
                    const replacing =
                      replacementTarget?.dayIndex === dayIndex &&
                      replacementTarget.activityIndex === activityIndex;
                    const replacementOptions = options.filter(
                      (option) =>
                        option.placeId === activity.placeId ||
                        !usedPlaceIds.has(option.placeId),
                    );

                    return (
                      <article
                        key={`${day.date}-${activity.time}-${activity.placeId}`}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSlotBadgeClass(
                                  activity.slot,
                                )}`}
                              >
                                {activity.time} · {activity.slotLabel}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                                {activity.categoryName}
                              </span>
                            </div>
                            <h4 className="mt-2 text-base font-bold text-slate-950">
                              {activity.placeName}
                            </h4>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {activity.addressLine}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-slate-700">
                              {activity.entryPrice > 0
                                ? formatMoney(
                                    activity.entryPrice,
                                    activity.currency,
                                  ) + "/người"
                                : "Miễn phí / chưa ghi nhận phí"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                moveActivity(
                                  dayIndex,
                                  activityIndex,
                                  -1,
                                )
                              }
                              disabled={activityIndex === 0}
                              className="min-h-9 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 disabled:opacity-30"
                              aria-label={`Đưa ${activity.placeName} lên trước`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                moveActivity(
                                  dayIndex,
                                  activityIndex,
                                  1,
                                )
                              }
                              disabled={
                                activityIndex ===
                                day.activities.length - 1
                              }
                              className="min-h-9 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 disabled:opacity-30"
                              aria-label={`Đưa ${activity.placeName} xuống sau`}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setReplacementTarget({
                                  dayIndex,
                                  activityIndex,
                                })
                              }
                              className="min-h-9 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700"
                            >
                              Thay
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeActivity(
                                  dayIndex,
                                  activityIndex,
                                )
                              }
                              className="min-h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        {replacing ? (
                          <div className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row">
                            <select
                              defaultValue=""
                              onChange={(event) => {
                                if (event.target.value) {
                                  replaceActivity(
                                    event.target.value,
                                  );
                                }
                              }}
                              className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500"
                            >
                              <option value="">
                                Chọn địa điểm thay thế...
                              </option>
                              {replacementOptions.map(
                                (option) => (
                                  <option
                                    key={option.placeId}
                                    value={option.placeId}
                                  >
                                    {option.placeName} ·{" "}
                                    {option.entryPrice > 0
                                      ? formatMoney(
                                          option.entryPrice,
                                        )
                                      : "Miễn phí"}
                                  </option>
                                ),
                              )}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                setReplacementTarget(null)
                              }
                              className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : null}
                      </article>
                    );
                  },
                )}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                {canAdd ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={
                        addSelectionByDay[day.dayNumber] ?? ""
                      }
                      onChange={(event) =>
                        setAddSelectionByDay((current) => ({
                          ...current,
                          [day.dayNumber]: event.target.value,
                        }))
                      }
                      disabled={
                        isLoadingOptions ||
                        availableOptions.length === 0
                      }
                      className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 disabled:bg-slate-100"
                    >
                      <option value="">
                        {isLoadingOptions
                          ? "Đang tải địa điểm..."
                          : "Chọn địa điểm để thêm..."}
                      </option>
                      {availableOptions.map((option) => (
                        <option
                          key={option.placeId}
                          value={option.placeId}
                        >
                          {option.placeName} ·{" "}
                          {option.entryPrice > 0
                            ? formatMoney(option.entryPrice)
                            : "Miễn phí"}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addActivity(dayIndex)}
                      disabled={
                        isLoadingOptions ||
                        !addSelectionByDay[day.dayNumber]
                      }
                      className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                    >
                      + Thêm địa điểm
                    </button>
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-slate-500">
                    Không còn khung giờ trống phù hợp cho ngày này.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="sticky bottom-3 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-950">
              {totalActivities} hoạt động trong draft
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Khi xác nhận, backend kiểm tra lại Place, trùng lặp, ETA,
              openingHours và chi phí; Trip được lưu là snapshot không tự đổi.
            </p>
          </div>

          <button
            type="button"
            onClick={saveDraft}
            disabled={
              isSaving ||
              Boolean(savedTripId) ||
              totalActivities < 1
            }
            className="min-h-12 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {savedTripId
              ? "✓ Đã lưu chuyến đi"
              : isSaving
                ? "Đang xác minh & lưu..."
                : "Xác nhận & lưu chuyến đi"}
          </button>
        </div>

        {saveMessage ? (
          <div
            className={`mt-3 rounded-xl px-3 py-2 text-sm ${
              savedTripId
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {saveMessage}
            {savedTripId ? (
              <Link
                href="/chuyen-di-cua-toi"
                className="ml-2 font-bold underline"
              >
                Xem chuyến đi
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
