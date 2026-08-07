"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const MAX_CAPTION_LENGTH = 2000;
const MAX_MEDIA_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const ACCEPTED_MEDIA =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm";

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
]);

type Viewer = {
  displayName: string;
  avatarUrl: string | null;
};

type SavedTripSummary = {
  id: string;
  title: string;
  destinationName: string | null;
  dayCount: number;
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  viewer?: Viewer;
  savedTrips?: SavedTripSummary[];
  postId?: string;
  sourceTripId?: string | null;
  mediaCount?: number;
};

type ViewerContext = {
  viewer: Viewer;
  savedTrips: SavedTripSummary[];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitial(name: string): string {
  const normalized = name.trim();

  if (!normalized) {
    return "B";
  }

  return normalized
    .charAt(0)
    .toLocaleUpperCase("vi-VN");
}

async function readPayload(
  response: Response,
): Promise<ApiPayload> {
  try {
    return (await response.json()) as ApiPayload;
  } catch {
    return {};
  }
}

function validateMediaFiles(
  files: File[],
): string | null {
  if (files.length === 0) {
    return "Hãy chọn ảnh hoặc video để đăng.";
  }

  if (files.length > MAX_IMAGE_COUNT) {
    return `Mỗi bài đăng tối đa ${MAX_IMAGE_COUNT} ảnh.`;
  }

  for (const file of files) {
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      return "Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc video MP4, WebM.";
    }

    if (file.size > MAX_MEDIA_BYTES) {
      return "Mỗi ảnh hoặc video phải có dung lượng không quá 6 MB.";
    }
  }

  const videoFiles = files.filter((file) =>
    ALLOWED_VIDEO_TYPES.has(file.type),
  );

  if (
    videoFiles.length > 0 &&
    files.length !== 1
  ) {
    return "Video phải được đăng riêng. Không thể trộn video với nhiều ảnh.";
  }

  if (
    videoFiles.length === 0 &&
    files.some(
      (file) =>
        !ALLOWED_IMAGE_TYPES.has(file.type),
    )
  ) {
    return "Danh sách ảnh không hợp lệ.";
  }

  return null;
}

function Avatar({
  viewer,
  fallback = "B",
}: {
  viewer: Viewer | null;
  fallback?: string;
}) {
  if (viewer?.avatarUrl) {
    return (
      <div
        aria-label={`Ảnh đại diện của ${viewer.displayName}`}
        role="img"
        className="size-11 shrink-0 rounded-full bg-cover bg-center shadow-sm"
        style={{
          backgroundImage: `url("${viewer.avatarUrl}")`,
        }}
      />
    );
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-semibold text-white shadow-sm">
      {viewer
        ? getInitial(viewer.displayName)
        : fallback}
    </div>
  );
}

export function SocialComposerLauncher() {
  const router = useRouter();
  const fileInputRef =
    useRef<HTMLInputElement>(null);
  const shareTripHandledRef =
    useRef(false);

  const [viewer, setViewer] =
    useState<Viewer | null>(null);
  const [savedTrips, setSavedTrips] =
    useState<SavedTripSummary[]>([]);
  const [viewerContextLoaded, setViewerContextLoaded] =
    useState(false);
  const [isOpen, setIsOpen] =
    useState(false);
  const [isCheckingSession, setIsCheckingSession] =
    useState(false);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [caption, setCaption] =
    useState("");
  const [selectedMedia, setSelectedMedia] =
    useState<File[]>([]);
  const [selectedTripId, setSelectedTripId] =
    useState("");
  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    if (shareTripHandledRef.current) {
      return;
    }

    const searchParams = new URLSearchParams(
      window.location.search,
    );
    const shareTripId =
      searchParams.get("shareTrip");

    if (!shareTripId) {
      return;
    }

    shareTripHandledRef.current = true;

    async function loadSharedTripComposer() {
      setSuccessMessage("");
      setIsCheckingSession(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/social/posts",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload =
          await readPayload(response);

        if (response.status === 401) {
          const message =
            encodeURIComponent(
              "Vui lòng đăng nhập để chia sẻ chuyến đi của bạn.",
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

        if (!response.ok || !payload.viewer) {
          setErrorMessage(
            payload.message ??
              "Không thể kiểm tra tài khoản. Vui lòng thử lại.",
          );
          return;
        }

        const availableTrips =
          payload.savedTrips ?? [];
        const selectedTrip =
          availableTrips.find(
            (trip) => trip.id === shareTripId,
          ) ?? null;

        setViewer(payload.viewer);
        setSavedTrips(availableTrips);
        setViewerContextLoaded(true);
        setIsOpen(true);

        if (selectedTrip) {
          setSelectedTripId(selectedTrip.id);
          setCaption((current) =>
            current.trim()
              ? current
              : `Mình muốn chia sẻ chuyến đi ${selectedTrip.title} cùng VTripPlanner 🧳`,
          );
        } else {
          setErrorMessage(
            "Chuyến đi này không còn trong danh sách đã lưu của bạn. Bạn vẫn có thể đăng bài bình thường.",
          );
        }

        const nextUrl = new URL(
          window.location.href,
        );
        nextUrl.searchParams.delete(
          "shareTrip",
        );
        nextUrl.hash = "cong-dong";

        window.history.replaceState(
          null,
          "",
          `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
        );
      } catch {
        setErrorMessage(
          "Không thể kết nối để mở chuyến đi. Vui lòng thử lại.",
        );
      } finally {
        setIsCheckingSession(false);
      }
    }

    void loadSharedTripComposer();
  }, []);

  async function ensureViewer(): Promise<ViewerContext | null> {
    if (viewer && viewerContextLoaded) {
      return {
        viewer,
        savedTrips,
      };
    }

    setIsCheckingSession(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/social/posts",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const payload =
        await readPayload(response);

      if (response.status === 401) {
        const message = encodeURIComponent(
          "Vui lòng đăng nhập để chia sẻ chuyến đi của bạn.",
        );
        window.location.href =
          `/dang-nhap?message=${message}`;
        return null;
      }

      if (response.status === 403) {
        window.location.href =
          "/khong-co-quyen?reason=inactive";
        return null;
      }

      if (!response.ok || !payload.viewer) {
        setErrorMessage(
          payload.message ??
            "Không thể kiểm tra tài khoản. Vui lòng thử lại.",
        );
        return null;
      }

      const availableTrips =
        payload.savedTrips ?? [];

      setViewer(payload.viewer);
      setSavedTrips(availableTrips);
      setViewerContextLoaded(true);

      return {
        viewer: payload.viewer,
        savedTrips: availableTrips,
      };
    } catch {
      setErrorMessage(
        "Không thể kết nối để kiểm tra tài khoản. Vui lòng thử lại.",
      );
      return null;
    } finally {
      setIsCheckingSession(false);
    }
  }

  async function openComposer() {
    setSuccessMessage("");

    const activeContext =
      await ensureViewer();

    if (!activeContext) {
      return;
    }

    setErrorMessage("");
    setIsOpen(true);
  }

  function closeComposer() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    setErrorMessage("");
  }

  function applyMediaFiles(files: File[]) {
    const validationError =
      validateMediaFiles(files);

    if (validationError) {
      setSelectedMedia([]);
      setErrorMessage(validationError);
      return;
    }

    setSelectedMedia(files);
    setErrorMessage("");
  }

  function handleMediaChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files ?? [],
    );

    applyMediaFiles(files);
    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLLabelElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const files = Array.from(
      event.dataTransfer.files,
    );

    applyMediaFiles(files);
  }

  function removeSelectedMedia(index: number) {
    setSelectedMedia((current) =>
      current.filter(
        (_, mediaIndex) =>
          mediaIndex !== index,
      ),
    );
    setErrorMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedCaption = caption.trim();

    if (!trimmedCaption) {
      setErrorMessage(
        "Hãy viết vài dòng về chuyến đi của bạn.",
      );
      return;
    }

    const mediaValidationError =
      validateMediaFiles(selectedMedia);

    if (mediaValidationError) {
      setErrorMessage(mediaValidationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.set(
      "caption",
      trimmedCaption,
    );

    for (const media of selectedMedia) {
      formData.append(
        "media",
        media,
        media.name,
      );
    }

    if (selectedTripId) {
      formData.set(
        "sourceTripId",
        selectedTripId,
      );
    }

    try {
      const response = await fetch(
        "/api/social/posts",
        {
          method: "POST",
          body: formData,
        },
      );

      const payload =
        await readPayload(response);

      if (response.status === 401) {
        const message = encodeURIComponent(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
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

      if (!response.ok) {
        setErrorMessage(
          payload.message ??
            "Không thể đăng bài. Vui lòng thử lại.",
        );
        return;
      }

      setCaption("");
      setSelectedMedia([]);
      setSelectedTripId("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setIsOpen(false);
      setSuccessMessage(
        payload.message ??
          "Đã đăng chuyến đi của bạn.",
      );

      router.refresh();
    } catch {
      setErrorMessage(
        "Không thể kết nối để đăng bài. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedTrip =
    savedTrips.find(
      (trip) => trip.id === selectedTripId,
    ) ?? null;

  const isVideoSelection =
    selectedMedia.length === 1 &&
    ALLOWED_VIDEO_TYPES.has(
      selectedMedia[0]?.type ?? "",
    );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {successMessage ? (
        <div
          role="status"
          className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 sm:px-5"
        >
          ✓ {successMessage}
        </div>
      ) : null}

      <div className="flex items-center gap-3 p-4 sm:p-5">
        <Avatar viewer={viewer} />

        <button
          type="button"
          onClick={openComposer}
          disabled={isCheckingSession}
          className="flex-1 rounded-full bg-slate-100 px-5 py-3 text-left text-sm font-normal text-slate-500 transition hover:bg-slate-200 disabled:cursor-wait disabled:opacity-70"
        >
          {isCheckingSession
            ? "Đang kiểm tra tài khoản..."
            : "Chia sẻ chuyến đi của bạn"}
        </button>
      </div>

      <div className="grid grid-cols-2 border-t border-slate-100 px-4 py-2 text-center text-xs font-medium text-slate-600 sm:grid-cols-4 sm:px-5 sm:text-sm">
        <button
          type="button"
          onClick={openComposer}
          disabled={isCheckingSession}
          className="rounded-xl py-2.5 transition hover:bg-slate-50 disabled:cursor-wait"
        >
          📷 Nhiều ảnh
        </button>
        <button
          type="button"
          onClick={openComposer}
          disabled={isCheckingSession}
          className="rounded-xl py-2.5 transition hover:bg-slate-50 disabled:cursor-wait"
        >
          🎬 Video
        </button>
        <button
          type="button"
          onClick={() => {
            router.push("/bai-viet-cua-toi");
          }}
          className="rounded-xl py-2.5 transition hover:bg-slate-50"
        >
          📝 Bài viết của tôi
        </button>
        <button
          type="button"
          onClick={() => {
            router.push("/bai-viet-da-luu");
          }}
          className="rounded-xl py-2.5 transition hover:bg-slate-50"
        >
          🔖 Bài viết đã lưu
        </button>
      </div>

      {errorMessage && !isOpen ? (
        <p
          role="alert"
          className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:px-5"
        >
          {errorMessage}
        </p>
      ) : null}

      {isOpen && viewer ? (
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar viewer={viewer} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {viewer.displayName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chia sẻ với cộng đồng VTripPlanner
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeComposer}
              disabled={isSubmitting}
              aria-label="Đóng trình đăng bài"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-4"
          >
            <label className="block">
              <span className="sr-only">
                Nội dung bài đăng
              </span>
              <textarea
                required
                rows={5}
                maxLength={MAX_CAPTION_LENGTH}
                value={caption}
                onChange={(event) => {
                  setCaption(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Chuyến đi này có điều gì khiến bạn muốn chia sẻ?"
                disabled={isSubmitting}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50"
              />
            </label>

            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Tối đa 10 ảnh hoặc 1 video · 6 MB mỗi file.
              </span>
              <span>
                {caption.length}/
                {MAX_CAPTION_LENGTH}
              </span>
            </div>

            {savedTrips.length > 0 ? (
              <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-700">
                  🧳 Gắn chuyến đi đã lưu
                </span>
                <select
                  value={selectedTripId}
                  onChange={(event) => {
                    setSelectedTripId(
                      event.target.value,
                    );
                    setErrorMessage("");
                  }}
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="">
                    Không gắn chuyến đi
                  </option>
                  {savedTrips.map((trip) => (
                    <option
                      key={trip.id}
                      value={trip.id}
                    >
                      {trip.title}
                    </option>
                  ))}
                </select>

                {selectedTrip ? (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {selectedTrip.destinationName ??
                      "Điểm đến chưa xác định"}
                    {" · "}
                    {selectedTrip.dayCount} ngày
                    {" · Chỉ công khai tóm tắt chuyến đi"}
                  </p>
                ) : null}
              </label>
            ) : null}

            <label
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={handleDrop}
              className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 transition hover:border-emerald-400 hover:bg-emerald-50/40"
            >
              <input
                ref={fileInputRef}
                multiple
                type="file"
                name="media"
                accept={ACCEPTED_MEDIA}
                onChange={handleMediaChange}
                disabled={isSubmitting}
                className="sr-only"
              />
              <span className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700">
                <span aria-hidden="true">
                  ＋
                </span>
                Chọn nhiều ảnh hoặc một video
              </span>
              <span className="mt-1 block text-center text-xs text-slate-500">
                Có thể kéo thả · JPEG, PNG, WebP, MP4 hoặc WebM
              </span>
            </label>

            {selectedMedia.length > 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-900">
                    {isVideoSelection
                      ? "1 video đã chọn"
                      : `${selectedMedia.length}/${MAX_IMAGE_COUNT} ảnh đã chọn`}
                  </p>
                  <span className="text-[11px] text-emerald-700">
                    Giữ theo thứ tự bạn chọn
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {selectedMedia.map(
                    (media, index) => (
                      <div
                        key={`${media.name}-${media.size}-${media.lastModified}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">
                            {media.type.startsWith(
                              "video/",
                            )
                              ? "🎬 "
                              : `📷 ${index + 1}. `}
                            {media.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatFileSize(
                              media.size,
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeSelectedMedia(
                              index,
                            )
                          }
                          disabled={isSubmitting}
                          className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Bỏ ảnh
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !caption.trim() ||
                selectedMedia.length === 0
              }
              className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting
                ? "Đang đăng..."
                : "Đăng"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
