"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

const INTEREST_OPTIONS = [
  "Khám phá cảnh đẹp",
  "Ẩm thực",
  "Văn hóa - lịch sử",
  "Nghỉ dưỡng",
  "Trải nghiệm địa phương",
];

type BudgetLevel =
  | "ECONOMY"
  | "STANDARD"
  | "PREMIUM";

type PlanActivity = {
  slot: "MORNING" | "AFTERNOON" | "EVENING";
  slotLabel: string;
  time: string;
  placeId: string;
  placeName: string;
  categoryName: string;
  addressLine: string;
  provinceName: string;
  imageUrl: string | null;
  shortDescription: string | null;
  seasonNote: string | null;
  entryPrice: number;
  currency: string;
  score: number;
  reasons: string[];
  openingNote: string;
  distanceFromPreviousKm: number | null;
};

type PlanDay = {
  dayNumber: number;
  date: string;
  dateLabel: string;
  summary: string;
  activities: PlanActivity[];
};

type TripPlan = {
  destination: string;
  startDate: string;
  duration: number;
  budget: BudgetLevel;
  interests: string[];
  candidateCount: number;
  scheduledPlaceCount: number;
  estimatedEntryFees: number;
  currency: string;
  personalization: {
    applied: boolean;
    reactionCount: number;
    matchedPlaceCount: number;
    preferredMonths: number[];
  };
  scoringGuide: string[];
  days: PlanDay[];
};

type PlanApiResponse = {
  ok?: boolean;
  plan?: TripPlan;
  message?: string;
  availableDestinations?: string[];
};

type SaveTripApiResponse = {
  ok?: boolean;
  savedTrip?: {
    id: string;
    title: string;
    status: string;
    dayCount: number;
    activityCount: number;
  };
  message?: string;
};

const BUDGET_LABELS: Record<
  BudgetLevel,
  string
> = {
  ECONOMY: "Tiết kiệm",
  STANDARD: "Cân bằng",
  PREMIUM: "Thoải mái",
};

function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function getSlotBadgeClass(
  slot: PlanActivity["slot"],
): string {
  if (slot === "MORNING") {
    return "bg-amber-50 text-amber-700";
  }

  if (slot === "AFTERNOON") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-indigo-50 text-indigo-700";
}

export function TripPlannerLauncher() {
  const today = useMemo(
    () => getLocalDateKey(),
    [],
  );

  const [isOpen, setIsOpen] =
    useState(false);
  const [destination, setDestination] =
    useState("Đà Lạt");
  const [startDate, setStartDate] =
    useState(today);
  const [duration, setDuration] =
    useState(3);
  const [budget, setBudget] =
    useState<BudgetLevel>("STANDARD");
  const [interests, setInterests] =
    useState<string[]>([
      "Khám phá cảnh đẹp",
    ]);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [
    availableDestinations,
    setAvailableDestinations,
  ] = useState<string[]>([]);
  const [plan, setPlan] =
    useState<TripPlan | null>(null);
  const [isSaving, setIsSaving] =
    useState(false);
  const [savedTripId, setSavedTripId] =
    useState<string | null>(null);
  const [saveMessage, setSaveMessage] =
    useState("");

  function toggleInterest(
    interest: string,
  ) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter(
            (item) => item !== interest,
          )
        : [...current, interest],
    );
  }

  async function readPayload(
    response: Response,
  ): Promise<PlanApiResponse> {
    try {
      return (
        (await response.json()) as PlanApiResponse
      );
    } catch {
      return {};
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage("");
    setAvailableDestinations([]);
    setSavedTripId(null);
    setSaveMessage("");

    try {
      const response = await fetch(
        "/api/trip-planner/plan",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            destination,
            startDate,
            duration,
            budget,
            interests,
          }),
        },
      );

      const payload =
        await readPayload(response);

      if (
        !response.ok ||
        !payload.plan
      ) {
        setPlan(null);
        setErrorMessage(
          payload.message ??
            "Không thể tạo lịch trình. Vui lòng thử lại.",
        );
        setAvailableDestinations(
          payload.availableDestinations ??
            [],
        );
        return;
      }

      setPlan(payload.plan);
    } catch {
      setPlan(null);
      setErrorMessage(
        "Không thể kết nối để tạo lịch trình. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSavePlan() {
    if (!plan || isSaving || savedTripId) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/trip-planner/save",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            destination:
              plan.destination,
            startDate:
              plan.startDate,
            duration:
              plan.duration,
            budget:
              plan.budget,
            interests:
              plan.interests,
          }),
        },
      );

      if (response.status === 401) {
        const message = encodeURIComponent(
          "Vui lòng đăng nhập, sau đó tạo lại lịch trình để lưu chuyến đi.",
        );

        window.location.href =
          `/dang-nhap?message=${message}`;

        return;
      }

      if (response.status === 403) {
        window.location.href =
          "/khong-co-quyen?reason=inactive";
        return;
      }

      let payload: SaveTripApiResponse = {};

      try {
        payload =
          (await response.json()) as SaveTripApiResponse;
      } catch {
        payload = {};
      }

      if (
        !response.ok ||
        !payload.savedTrip
      ) {
        setSaveMessage(
          payload.message ??
            "Không thể lưu chuyến đi. Vui lòng thử lại.",
        );
        return;
      }

      setSavedTripId(
        payload.savedTrip.id,
      );
      setSaveMessage(
        `Đã lưu "${payload.savedTrip.title}" với ${payload.savedTrip.dayCount} ngày và ${payload.savedTrip.activityCount} hoạt động.`,
      );
    } catch {
      setSaveMessage(
        "Không thể kết nối để lưu chuyến đi. Vui lòng thử lại.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
        <button
          type="button"
          onClick={() => {
            setIsOpen((current) => !current);
            setErrorMessage("");
          }}
          className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-400"
        >
          ✈ Tạo chuyến đi
        </button>

        <a
          href="#cong-dong"
          className="rounded-2xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
        >
          Xem cộng đồng ↓
        </a>

        <a
          href="/chuyen-di-cua-toi"
          className="rounded-2xl border border-white/15 bg-slate-950/25 px-5 py-3 text-sm font-medium text-slate-100 backdrop-blur transition hover:bg-white/10"
        >
          🧳 Chuyến đi của tôi
        </a>
      </div>

      {isOpen ? (
        <div className="mt-5 rounded-3xl border border-white/15 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Trip Planner nội bộ
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Tạo lịch trình từ dữ liệu thật
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                Hệ thống ưu tiên địa điểm theo sở thích, mùa đi, ngân sách và reaction của bạn nếu đã đăng nhập.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            >
              Thu gọn
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-4 lg:grid-cols-12"
          >
            <label className="lg:col-span-4">
              <span className="text-xs font-medium text-slate-300">
                Điểm đến
              </span>
              <input
                required
                maxLength={100}
                value={destination}
                onChange={(event) =>
                  setDestination(
                    event.target.value,
                  )
                }
                placeholder="Ví dụ: Đà Lạt"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </label>

            <label className="lg:col-span-3">
              <span className="text-xs font-medium text-slate-300">
                Ngày bắt đầu
              </span>
              <input
                required
                type="date"
                min={today}
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </label>

            <label className="lg:col-span-2">
              <span className="text-xs font-medium text-slate-300">
                Số ngày
              </span>
              <select
                value={duration}
                onChange={(event) =>
                  setDuration(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(
                  (day) => (
                    <option
                      key={day}
                      value={day}
                    >
                      {day} ngày
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="lg:col-span-3">
              <span className="text-xs font-medium text-slate-300">
                Ngân sách
              </span>
              <select
                value={budget}
                onChange={(event) =>
                  setBudget(
                    event.target
                      .value as BudgetLevel,
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
              >
                {(
                  Object.keys(
                    BUDGET_LABELS,
                  ) as BudgetLevel[]
                ).map((level) => (
                  <option
                    key={level}
                    value={level}
                  >
                    {BUDGET_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="lg:col-span-12">
              <legend className="text-xs font-medium text-slate-300">
                Sở thích
              </legend>

              <div className="mt-2 flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(
                  (interest) => {
                    const selected =
                      interests.includes(
                        interest,
                      );

                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() =>
                          toggleInterest(
                            interest,
                          )
                        }
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                          selected
                            ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                            : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {selected
                          ? "✓ "
                          : ""}
                        {interest}
                      </button>
                    );
                  },
                )}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3 lg:col-span-12">
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !destination.trim() ||
                  !startDate
                }
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:bg-slate-600 disabled:text-slate-300"
              >
                {isSubmitting
                  ? "Đang xếp lịch..."
                  : "Tạo lịch trình"}
              </button>

              <p className="text-xs leading-5 text-slate-400">
                Preview chỉ được lưu khi bạn bấm “Lưu chuyến đi”.
              </p>
            </div>
          </form>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              <p className="font-medium">
                {errorMessage}
              </p>

              {availableDestinations.length >
              0 ? (
                <p className="mt-2 text-xs leading-5 text-red-200/80">
                  Dữ liệu hiện có:{" "}
                  {availableDestinations.join(
                    ", ",
                  )}
                  .
                </p>
              ) : null}
            </div>
          ) : null}

          {plan ? (
            <div className="mt-6 overflow-hidden rounded-3xl bg-slate-50 text-slate-950 shadow-xl">
              <div className="border-b border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      Lịch trình đề xuất
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {plan.destination} ·{" "}
                      {plan.duration} ngày
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Đã xếp{" "}
                      {
                        plan.scheduledPlaceCount
                      }{" "}
                      địa điểm từ{" "}
                      {plan.candidateCount} ứng viên
                      trong database.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Phí tham quan ước tính
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-900">
                      {formatMoney(
                        plan.estimatedEntryFees,
                        plan.currency,
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Chưa gồm ăn ở và di chuyển.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {BUDGET_LABELS[
                      plan.budget
                    ]}
                  </span>

                  {plan.personalization
                    .applied ? (
                    <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                      ♥ Có cá nhân hóa từ{" "}
                      {
                        plan.personalization
                          .reactionCount
                      }{" "}
                      reaction
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      Chưa có reaction để cá nhân hóa
                    </span>
                  )}

                  {plan.personalization
                    .matchedPlaceCount > 0 ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                      {
                        plan.personalization
                          .matchedPlaceCount
                      }{" "}
                      địa điểm trùng sở thích reaction
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    disabled={
                      isSaving ||
                      Boolean(savedTripId)
                    }
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savedTripId
                      ? "✓ Đã lưu chuyến đi"
                      : isSaving
                        ? "Đang lưu..."
                        : "💾 Lưu chuyến đi"}
                  </button>

                  <p className="text-xs leading-5 text-slate-500">
                    {savedTripId
                      ? "Chuyến đi đã được ghi vào tài khoản của bạn."
                      : "Chỉ lưu khi bạn chủ động chọn; tạo preview không tự sinh dữ liệu Trip."}
                  </p>
                </div>

                {saveMessage ? (
                  <p
                    role="status"
                    className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${
                      savedTripId
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {saveMessage}
                  </p>
                ) : null}
              </div>

              <div className="space-y-5 p-4 sm:p-6">
                {plan.days.map((day) => (
                  <section
                    key={day.date}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">
                          NGÀY{" "}
                          {day.dayNumber}
                        </p>
                        <h4 className="mt-1 font-semibold capitalize text-slate-950">
                          {day.dateLabel}
                        </h4>
                      </div>

                      <p className="max-w-lg text-xs leading-5 text-slate-500">
                        {day.summary}
                      </p>
                    </div>

                    {day.activities.length >
                    0 ? (
                      <div className="mt-4 grid gap-3">
                        {day.activities.map(
                          (activity) => (
                            <article
                              key={`${day.date}-${activity.slot}-${activity.placeId}`}
                              className="grid overflow-hidden rounded-2xl border border-slate-200 md:grid-cols-[150px_1fr]"
                            >
                              {activity.imageUrl ? (
                                <div
                                  role="img"
                                  aria-label={
                                    activity.placeName
                                  }
                                  className="min-h-32 bg-slate-100 bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url("${activity.imageUrl}")`,
                                  }}
                                />
                              ) : (
                                <div className="flex min-h-32 items-center justify-center bg-slate-100 text-3xl">
                                  📍
                                </div>
                              )}

                              <div className="p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSlotBadgeClass(
                                      activity.slot,
                                    )}`}
                                  >
                                    {
                                      activity.time
                                    }{" "}
                                    ·{" "}
                                    {
                                      activity.slotLabel
                                    }
                                  </span>

                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                    {
                                      activity.categoryName
                                    }
                                  </span>

                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                    Điểm phù hợp{" "}
                                    {
                                      activity.score
                                    }
                                  </span>
                                </div>

                                <h5 className="mt-3 text-base font-semibold text-slate-950">
                                  {
                                    activity.placeName
                                  }
                                </h5>

                                <p className="mt-1 text-xs text-slate-500">
                                  📍{" "}
                                  {
                                    activity.addressLine
                                  }
                                  {" · "}
                                  {
                                    activity.provinceName
                                  }
                                </p>

                                {activity.shortDescription ? (
                                  <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {
                                      activity.shortDescription
                                    }
                                  </p>
                                ) : null}

                                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                  {activity.reasons.map(
                                    (reason) => (
                                      <span
                                        key={reason}
                                        className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600"
                                      >
                                        {reason}
                                      </span>
                                    ),
                                  )}
                                </div>

                                <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                                  <p>
                                    🕒{" "}
                                    {
                                      activity.openingNote
                                    }
                                  </p>
                                  <p>
                                    🎟{" "}
                                    {activity.entryPrice >
                                    0
                                      ? formatMoney(
                                          activity.entryPrice,
                                          activity.currency,
                                        )
                                      : "Không có phí vào cửa trong dữ liệu"}
                                  </p>

                                  {activity.distanceFromPreviousKm !==
                                  null ? (
                                    <p className="sm:col-span-2">
                                      ↔ Khoảng cách thẳng từ điểm trước:{" "}
                                      {
                                        activity.distanceFromPreviousKm
                                      }{" "}
                                      km
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        Chưa có hoạt động phù hợp để xếp vào ngày này.
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <div className="border-t border-slate-200 bg-white px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
                Lịch trình này được tạo bằng thuật toán nội bộ từ dữ liệu VTripPlanner, không phải AI sinh tự do. Giá, mùa và giờ mở cửa chỉ phản ánh dữ liệu hiện có trong đồ án.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
