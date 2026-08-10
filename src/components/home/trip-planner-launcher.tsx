"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { TRIP_DRAFT_STORAGE_KEY } from "@/lib/trip-planner/draft-itinerary";

const INTEREST_OPTIONS = [
  "Khám phá cảnh đẹp",
  "Ẩm thực",
  "Văn hóa - lịch sử",
  "Nghỉ dưỡng",
  "Trải nghiệm địa phương",
];

type TripTransportMode =
  | "MOTORBIKE"
  | "CAR"
  | "COACH";

type TripPlannerProvinceOption = {
  id: string;
  name: string;
};

type ProvinceOptionsApiResponse = {
  ok?: boolean;
  origins?: TripPlannerProvinceOption[];
  destinations?: TripPlannerProvinceOption[];
  message?: string;
};

type TripTravelEstimate = {
  origin: string;
  destination: string;
  transportMode: TripTransportMode;
  departureAt: string;
  arrivalAt: string;
  distanceKm: number | null;
  durationMinutes: number;
  source: "GOOGLE_ROUTES" | "INTERNAL_FALLBACK";
  sourceLabel: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  warning: string | null;
};

type TripBudgetEstimate = {
  profile: "ECONOMY" | "BALANCED" | "COMFORTABLE";
  profileLabel: string;
  totalBudget: number;
  travelerCount: number;
  duration: number;
  perPersonPerDay: number;
  transportCost: number;
  accommodationCost: number;
  foodCost: number;
  activityCost: number;
  reserveAmount: number;
  plannedCost: number;
  remainingAfterReserve: number;
  isOverBudget: boolean;
  currency: "VND";
  assumptions: string[];
};

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
  origin: string;
  destination: string;
  startDate: string;
  departureTime: string;
  transportMode: TripTransportMode;
  travelEstimate: TripTravelEstimate | null;
  travelEstimateMessage: string | null;
  duration: number;
  travelerCount: number;
  totalBudget: number;
  budgetEstimate: TripBudgetEstimate;
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


const TRANSPORT_OPTIONS: Record<
  TripTransportMode,
  {
    icon: string;
    label: string;
    description: string;
  }
> = {
  MOTORBIKE: {
    icon: "🛵",
    label: "Xe máy",
    description: "Google TWO_WHEELER khi khả dụng",
  },
  CAR: {
    icon: "🚗",
    label: "Ô tô",
    description: "Google DRIVE khi khả dụng",
  },
  COACH: {
    icon: "🚌",
    label: "Xe khách",
    description: "Đường bộ + buffer dừng/nghỉ",
  },
};

function getLocalDateKey(
  value = new Date(),
): string {
  const year = value.getFullYear();
  const month = String(
    value.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    value.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultDeparture(): {
  date: string;
  time: string;
} {
  const value = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  );
  const roundedMinutes =
    Math.ceil(value.getMinutes() / 30) * 30;

  if (roundedMinutes >= 60) {
    value.setHours(
      value.getHours() + 1,
      0,
      0,
      0,
    );
  } else {
    value.setMinutes(
      roundedMinutes,
      0,
      0,
    );
  }

  if (value.getHours() >= 22) {
    value.setDate(value.getDate() + 1);
    value.setHours(8, 0, 0, 0);
  }

  return {
    date: getLocalDateKey(value),
    time: `${String(value.getHours()).padStart(
      2,
      "0",
    )}:${String(value.getMinutes()).padStart(
      2,
      "0",
    )}`,
  };
}

function formatTravelDateTime(
  value: string,
): string {
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

function formatDuration(
  totalMinutes: number,
): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} phút`;
  }

  if (minutes === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${minutes} phút`;
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

export function TripPlannerLauncher({
  pageMode = false,
}: {
  pageMode?: boolean;
}) {
  const router = useRouter();
  const today = useMemo(
    () => getLocalDateKey(),
    [],
  );
  const defaultDeparture = useMemo(
    () => getDefaultDeparture(),
    [],
  );

  const [isOpen, setIsOpen] =
    useState(pageMode);
  const [
    originProvinceId,
    setOriginProvinceId,
  ] = useState("");
  const [
    destinationProvinceId,
    setDestinationProvinceId,
  ] = useState("");
  const [
    originOptions,
    setOriginOptions,
  ] = useState<TripPlannerProvinceOption[]>([]);
  const [
    destinationOptions,
    setDestinationOptions,
  ] = useState<TripPlannerProvinceOption[]>([]);
  const [
    provinceOptionsLoading,
    setProvinceOptionsLoading,
  ] = useState(true);
  const [startDate, setStartDate] =
    useState(defaultDeparture.date);
  const [departureTime, setDepartureTime] =
    useState(defaultDeparture.time);
  const [transportMode, setTransportMode] =
    useState<TripTransportMode>("CAR");
  const [duration, setDuration] =
    useState(3);
  const [travelerCount, setTravelerCount] =
    useState(2);
  const [totalBudget, setTotalBudget] =
    useState(6000000);
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

  const selectedOrigin = useMemo(
    () =>
      originOptions.find(
        (option) =>
          option.id === originProvinceId,
      ) ?? null,
    [originOptions, originProvinceId],
  );

  const selectedDestination = useMemo(
    () =>
      destinationOptions.find(
        (option) =>
          option.id === destinationProvinceId,
      ) ?? null,
    [
      destinationOptions,
      destinationProvinceId,
    ],
  );

  const origin =
    selectedOrigin?.name ?? "";
  const destination =
    selectedDestination?.name ?? "";

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadProvinceOptions() {
      try {
        const response = await fetch(
          "/api/trip-planner/provinces",
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload =
          (await response.json()) as ProvinceOptionsApiResponse;

        if (
          !response.ok ||
          !Array.isArray(payload.origins) ||
          !Array.isArray(payload.destinations)
        ) {
          throw new Error(
            payload.message ??
              "Không thể tải danh sách khu vực.",
          );
        }

        setOriginOptions(
          payload.origins,
        );
        setDestinationOptions(
          payload.destinations,
        );

        const preferredOrigin =
          payload.origins.find((option) =>
            option.name
              .toLocaleLowerCase("vi")
              .includes("hồ chí minh"),
          ) ?? payload.origins[0];

        const preferredDestination =
          payload.destinations.find(
            (option) =>
              option.name
                .toLocaleLowerCase("vi")
                .includes("đà lạt"),
          ) ?? payload.destinations[0];

        setOriginProvinceId(
          (current) =>
            current ||
            preferredOrigin?.id ||
            "",
        );

        setDestinationProvinceId(
          (current) =>
            current ||
            preferredDestination?.id ||
            "",
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách khu vực.",
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setProvinceOptionsLoading(
            false,
          );
        }
      }
    }

    void loadProvinceOptions();

    return () => {
      controller.abort();
    };
  }, []);

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
            originProvinceId,
            destinationProvinceId,
            origin,
            destination,
            startDate,
            departureTime,
            transportMode,
            duration,
            travelerCount,
            totalBudget,
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
      sessionStorage.removeItem(
        TRIP_DRAFT_STORAGE_KEY,
      );
    } catch {
      setPlan(null);
      setErrorMessage(
        "Không thể kết nối để tạo lịch trình. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }


  function handleCustomizePlan() {
    if (!plan) {
      return;
    }

    sessionStorage.setItem(
      TRIP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        storedAt: new Date().toISOString(),
        plan,
      }),
    );

    router.push(
      "/lap-lich-trinh/tuy-chinh",
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 lg:justify-start">
        {!pageMode ? (
          <button
            type="button"
            onClick={() => {
              setIsOpen((current) => !current);
              setErrorMessage("");
            }}
            className="min-h-11 w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-400 sm:w-auto"
          >
            ✈ Tạo chuyến đi
          </button>
        ) : null}

        <a
          href={pageMode ? "/#cong-dong" : "#cong-dong"}
          className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
        >
          Xem cộng đồng ↓
        </a>

        <a
          href="/chuyen-di-cua-toi"
          className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/15 bg-slate-950/25 px-5 py-3 text-sm font-medium text-slate-100 backdrop-blur transition hover:bg-white/10 sm:w-auto"
        >
          🧳 Chuyến đi của tôi
        </a>
      </div>

      {isOpen ? (
        <div className="mt-5 rounded-3xl border border-white/15 bg-slate-950/55 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Trip Planner nội bộ
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Tạo lịch trình từ dữ liệu thật
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                Chọn điểm xuất phát và điểm đến từ các khu vực có trong hệ thống; giờ khởi hành, phương tiện, sở thích, mùa đi, ngân sách và tín hiệu cá nhân hóa vẫn được giữ nguyên.
              </p>
            </div>

            {!pageMode ? (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
              >
                Thu gọn
              </button>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-4 lg:grid-cols-12"
          >
            <label className="min-w-0 lg:col-span-6">
              <span className="text-xs font-medium text-slate-300">
                Điểm xuất phát
              </span>
              <select
                required
                value={originProvinceId}
                disabled={provinceOptionsLoading}
                onChange={(event) =>
                  setOriginProvinceId(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-wait disabled:opacity-60"
              >
                <option value="">
                  {provinceOptionsLoading
                    ? "Đang tải khu vực..."
                    : "Chọn điểm xuất phát"}
                </option>

                {originOptions.map(
                  (option) => (
                    <option
                      key={option.id}
                      value={option.id}
                      className="bg-slate-900 text-white"
                    >
                      {option.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="min-w-0 lg:col-span-6">
              <span className="text-xs font-medium text-slate-300">
                Điểm đến
              </span>
              <select
                required
                value={destinationProvinceId}
                disabled={provinceOptionsLoading}
                onChange={(event) =>
                  setDestinationProvinceId(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-wait disabled:opacity-60"
              >
                <option value="">
                  {provinceOptionsLoading
                    ? "Đang tải khu vực..."
                    : "Chọn điểm đến"}
                </option>

                {destinationOptions.map(
                  (option) => (
                    <option
                      key={option.id}
                      value={option.id}
                      className="bg-slate-900 text-white"
                    >
                      {option.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="min-w-0 lg:col-span-3">
              <span className="text-xs font-medium text-slate-300">
                Ngày khởi hành
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

            <label className="min-w-0 lg:col-span-3">
              <span className="text-xs font-medium text-slate-300">
                Giờ khởi hành
              </span>
              <input
                required
                type="time"
                value={departureTime}
                onChange={(event) =>
                  setDepartureTime(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </label>

            <label className="min-w-0 lg:col-span-2">
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

            <label className="min-w-0 lg:col-span-2">
              <span className="text-xs font-medium text-slate-300">
                Số người
              </span>
              <input
                required
                type="number"
                min={1}
                max={20}
                step={1}
                value={travelerCount}
                onChange={(event) =>
                  setTravelerCount(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </label>

            <label className="min-w-0 lg:col-span-2">
              <span className="text-xs font-medium text-slate-300">
                Tổng ngân sách
              </span>
              <input
                required
                type="number"
                min={100000}
                max={1000000000}
                step={100000}
                value={totalBudget}
                onChange={(event) =>
                  setTotalBudget(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                {formatMoney(totalBudget)}
              </span>
            </label>

            <fieldset className="lg:col-span-12">
              <legend className="text-xs font-medium text-slate-300">
                Phương tiện chính
              </legend>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  Object.keys(
                    TRANSPORT_OPTIONS,
                  ) as TripTransportMode[]
                ).map((mode) => {
                  const option =
                    TRANSPORT_OPTIONS[mode];
                  const selected =
                    transportMode === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setTransportMode(mode)
                      }
                      className={`min-h-16 rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-emerald-300 bg-emerald-400/20 text-emerald-50"
                          : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        {option.icon} {option.label}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 opacity-75">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

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
                        className={`min-h-10 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
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
                  provinceOptionsLoading ||
                  !originProvinceId ||
                  !destinationProvinceId ||
                  !startDate ||
                  !departureTime ||
                  travelerCount < 1 ||
                  travelerCount > 20 ||
                  totalBudget < 100000
                }
                className="min-h-11 w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:bg-slate-600 disabled:text-slate-300 sm:w-auto"
              >
                {isSubmitting
                  ? "Đang xếp lịch..."
                  : "Tạo lịch trình"}
              </button>

              <p className="text-xs leading-5 text-slate-400">
                Preview chưa tạo Trip. Bạn có thể tùy chỉnh draft trước khi xác nhận lưu.
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

                  <div className="w-full rounded-2xl bg-emerald-50 px-4 py-3 text-left sm:w-auto sm:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Tổng ngân sách
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-900">
                      {formatMoney(
                        plan.totalBudget,
                        plan.currency,
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      {plan.travelerCount} người ·{" "}
                      {formatMoney(
                        plan.budgetEstimate
                          .perPersonPerDay,
                        plan.currency,
                      )}
                      /người/ngày
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    💰 {plan.budgetEstimate.profileLabel}
                  </span>

                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
                    👥 {plan.travelerCount} người
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

              <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
                {plan.travelEstimate ? (
                  <div className="rounded-2xl border border-sky-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                          Di chuyển đến điểm đến
                        </p>
                        <h4 className="mt-1 text-base font-semibold text-slate-950">
                          {plan.origin} → {plan.destination}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {TRANSPORT_OPTIONS[plan.transportMode].icon}{" "}
                          {TRANSPORT_OPTIONS[plan.transportMode].label}
                        </p>
                      </div>

                      <span className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700">
                        {plan.travelEstimate.sourceLabel}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Khởi hành
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatTravelDateTime(
                            plan.travelEstimate.departureAt,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Dự kiến đến
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatTravelDateTime(
                            plan.travelEstimate.arrivalAt,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Quãng đường
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {plan.travelEstimate.distanceKm !== null
                            ? `~${plan.travelEstimate.distanceKm} km`
                            : "Chưa có dữ liệu"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Thời gian
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          ~{formatDuration(
                            plan.travelEstimate.durationMinutes,
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Độ tin cậy: {plan.travelEstimate.confidence}. Lịch ngày đầu chỉ bắt đầu sau ETA + 60 phút buffer.
                    </p>

                    {plan.travelEstimate.warning ? (
                      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                        ⚠ {plan.travelEstimate.warning}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    {plan.travelEstimateMessage ??
                      "Chưa có ETA cho chặng di chuyển này."}
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Dự toán ngân sách nội bộ
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-slate-950">
                        {plan.budgetEstimate.profileLabel} ·{" "}
                        {formatMoney(
                          plan.budgetEstimate
                            .perPersonPerDay,
                          plan.currency,
                        )}
                        /người/ngày
                      </h4>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                        plan.budgetEstimate
                          .isOverBudget
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {plan.budgetEstimate
                        .isOverBudget
                        ? "Vượt ngân sách"
                        : "Trong ngân sách"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      [
                        "Di chuyển",
                        plan.budgetEstimate
                          .transportCost,
                      ],
                      [
                        "Lưu trú",
                        plan.budgetEstimate
                          .accommodationCost,
                      ],
                      [
                        "Ăn uống",
                        plan.budgetEstimate
                          .foodCost,
                      ],
                      [
                        "Hoạt động",
                        plan.budgetEstimate
                          .activityCost,
                      ],
                      [
                        "Dự phòng 10%",
                        plan.budgetEstimate
                          .reserveAmount,
                      ],
                    ].map(
                      ([label, amount]) => (
                        <div
                          key={String(label)}
                          className="rounded-xl bg-slate-50 p-3"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatMoney(
                              Number(amount),
                              plan.currency,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                    <span className="text-slate-600">
                      Chi tiêu dự kiến:{" "}
                      <strong className="text-slate-900">
                        {formatMoney(
                          plan.budgetEstimate
                            .plannedCost,
                          plan.currency,
                        )}
                      </strong>
                    </span>

                    <span
                      className={
                        plan.budgetEstimate
                          .isOverBudget
                          ? "font-semibold text-red-700"
                          : "font-semibold text-emerald-700"
                      }
                    >
                      {plan.budgetEstimate
                        .isOverBudget
                        ? "Vượt "
                        : "Còn lại "}
                      {formatMoney(
                        Math.abs(
                          plan.budgetEstimate
                            .remainingAfterReserve,
                        ),
                        plan.currency,
                      )}
                      {" "}
                      sau dự phòng
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-slate-500">
                    Đây là dự toán MVP: phí hoạt động lấy từ database; ăn uống,
                    lưu trú và di chuyển dùng định mức nội bộ. Giá thực tế có thể
                    thay đổi và sẽ được thay bằng dữ liệu partner/provider ở các
                    bước sau.
                  </p>
                </div>
              </div>

              <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCustomizePlan}
                    className="min-h-11 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                  >
                    🛠 Tùy chỉnh lịch trình
                  </button>

                  <p className="max-w-2xl text-xs leading-5 text-slate-500">
                    Mở draft ở trang riêng để đổi thứ tự, thay, thêm hoặc xóa
                    địa điểm. Trip chỉ được tạo khi bạn bấm “Xác nhận & lưu
                    chuyến đi” ở bước tùy chỉnh.
                  </p>
                </div>
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
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid md:grid-cols-[220px_minmax(0,1fr)]"
                            >
                              {activity.imageUrl ? (
                                <div
                                  role="img"
                                  aria-label={
                                    activity.placeName
                                  }
                                  className="aspect-[3/2] w-full bg-slate-100 bg-cover bg-center md:aspect-auto md:min-h-[190px]"
                                  style={{
                                    backgroundImage: `url("${activity.imageUrl}")`,
                                  }}
                                />
                              ) : (
                                <div className="flex aspect-[3/2] w-full items-center justify-center bg-slate-100 text-3xl md:aspect-auto md:min-h-[190px]">
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
                Lịch trình được đề xuất dựa trên điểm đến, thời gian, ngân sách và sở thích của bạn. Thời gian di chuyển, giá và giờ mở cửa có thể thay đổi theo thực tế.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
