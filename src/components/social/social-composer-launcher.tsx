"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";

const MAX_CAPTION_LENGTH = 2000;
const MAX_MEDIA_BYTES = 6 * 1024 * 1024;
const ACCEPTED_MEDIA =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm";

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

type Viewer = {
  displayName: string;
  avatarUrl: string | null;
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  viewer?: Viewer;
  postId?: string;
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

  return normalized.charAt(0).toLocaleUpperCase("vi-VN");
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
        style={{ backgroundImage: `url("${viewer.avatarUrl}")` }}
      />
    );
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-semibold text-white shadow-sm">
      {viewer ? getInitial(viewer.displayName) : fallback}
    </div>
  );
}

export function SocialComposerLauncher() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function readPayload(response: Response): Promise<ApiPayload> {
    try {
      return (await response.json()) as ApiPayload;
    } catch {
      return {};
    }
  }

  async function ensureViewer(): Promise<Viewer | null> {
    if (viewer) {
      return viewer;
    }

    setIsCheckingSession(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/social/posts", {
        method: "GET",
        cache: "no-store",
      });

      const payload = await readPayload(response);

      if (response.status === 401) {
        const message = encodeURIComponent(
          "Vui lòng đăng nhập để chia sẻ chuyến đi của bạn.",
        );
        window.location.href = `/dang-nhap?message=${message}`;
        return null;
      }

      if (response.status === 403) {
        window.location.href = "/khong-co-quyen?reason=inactive";
        return null;
      }

      if (!response.ok || !payload.viewer) {
        setErrorMessage(
          payload.message ??
            "Không thể kiểm tra tài khoản. Vui lòng thử lại.",
        );
        return null;
      }

      setViewer(payload.viewer);
      return payload.viewer;
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

    const activeViewer = await ensureViewer();

    if (!activeViewer) {
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

  function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setErrorMessage("");

    if (!file) {
      setSelectedMedia(null);
      return;
    }

    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      setSelectedMedia(null);
      event.target.value = "";
      setErrorMessage(
        "Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc video MP4, WebM.",
      );
      return;
    }

    if (file.size > MAX_MEDIA_BYTES) {
      setSelectedMedia(null);
      event.target.value = "";
      setErrorMessage("Ảnh hoặc video phải có dung lượng không quá 6 MB.");
      return;
    }

    setSelectedMedia(file);
  }

  function removeSelectedMedia() {
    setSelectedMedia(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCaption = caption.trim();

    if (!trimmedCaption) {
      setErrorMessage("Hãy viết vài dòng về chuyến đi của bạn.");
      return;
    }

    if (!selectedMedia) {
      setErrorMessage("Hãy chọn một ảnh hoặc một video để đăng.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.set("caption", trimmedCaption);
    formData.set("media", selectedMedia);

    try {
      const response = await fetch("/api/social/posts", {
        method: "POST",
        body: formData,
      });

      const payload = await readPayload(response);

      if (response.status === 401) {
        const message = encodeURIComponent(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        );
        window.location.href = `/dang-nhap?message=${message}`;
        return;
      }

      if (response.status === 403) {
        window.location.href = "/khong-co-quyen?reason=inactive";
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
      setSelectedMedia(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setIsOpen(false);
      setSuccessMessage(
        payload.message ?? "Đã đăng chuyến đi của bạn.",
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

      <div className="grid grid-cols-2 border-t border-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-600 sm:px-5">
        <button
          type="button"
          onClick={openComposer}
          disabled={isCheckingSession}
          className="rounded-xl py-2.5 transition hover:bg-slate-50 disabled:cursor-wait"
        >
          📷 Ảnh
        </button>
        <button
          type="button"
          onClick={openComposer}
          disabled={isCheckingSession}
          className="rounded-xl py-2.5 transition hover:bg-slate-50 disabled:cursor-wait"
        >
          🎬 Video
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

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block">
              <span className="sr-only">Nội dung bài đăng</span>
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
              <span>Một ảnh hoặc một video, tối đa 6 MB.</span>
              <span>
                {caption.length}/{MAX_CAPTION_LENGTH}
              </span>
            </div>

            <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-50/40">
              <input
                ref={fileInputRef}
                required
                type="file"
                name="media"
                accept={ACCEPTED_MEDIA}
                onChange={handleMediaChange}
                disabled={isSubmitting}
                className="sr-only"
              />
              <span className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700">
                <span aria-hidden="true">＋</span>
                Chọn ảnh hoặc video
              </span>
              <span className="mt-1 block text-center text-xs text-slate-500">
                JPEG, PNG, WebP, MP4 hoặc WebM
              </span>
            </label>

            {selectedMedia ? (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {selectedMedia.type.startsWith("video/")
                      ? "🎬 "
                      : "📷 "}
                    {selectedMedia.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(selectedMedia.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeSelectedMedia}
                  disabled={isSubmitting}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Bỏ chọn
                </button>
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
                !selectedMedia
              }
              className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Đang đăng..." : "Đăng"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
