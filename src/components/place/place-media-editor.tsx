"use client";

import {
  ImagePlus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

export const MAX_PLACE_IMAGE_COUNT = 8;
export const MAX_PLACE_IMAGE_BYTES =
  6 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type PlaceMediaItem = {
  id: string;
  url: string;
  altText: string;
  isCover: boolean;
  sortOrder: number;
};

type UploadResult = {
  ok: boolean;
  message: string;
};

export async function uploadPlaceMediaFiles({
  placeId,
  files,
  coverIndex,
}: {
  placeId: string;
  files: File[];
  coverIndex: number | null;
}): Promise<UploadResult> {
  if (files.length === 0) {
    return {
      ok: true,
      message: "",
    };
  }

  const formData = new FormData();
  formData.append("placeId", placeId);

  if (coverIndex !== null) {
    formData.append(
      "coverIndex",
      String(coverIndex),
    );
  }

  for (const file of files) {
    formData.append("media", file);
  }

  try {
    const response = await fetch(
      "/api/place-media",
      {
        method: "POST",
        body: formData,
      },
    );

    let payload: {
      message?: string;
    } = {};

    try {
      payload = (await response.json()) as {
        message?: string;
      };
    } catch {
      payload = {};
    }

    return {
      ok: response.ok,
      message:
        payload.message ??
        (response.ok
          ? "Đã tải ảnh địa điểm."
          : "Không thể tải ảnh địa điểm."),
    };
  } catch {
    return {
      ok: false,
      message:
        "Không thể kết nối để tải ảnh địa điểm.",
    };
  }
}

type PlaceMediaEditorProps = {
  placeId: string | null;
  placeName: string;
  existingImages: PlaceMediaItem[];
  disabled?: boolean;
  pendingFiles?: File[];
  pendingCoverIndex?: number | null;
  onPendingFilesChange?: (
    files: File[],
  ) => void;
  onPendingCoverIndexChange?: (
    index: number | null,
  ) => void;
  accent?: "violet" | "sky";
};

export function PlaceMediaEditor({
  placeId,
  placeName,
  existingImages,
  disabled = false,
  pendingFiles = [],
  pendingCoverIndex = null,
  onPendingFilesChange,
  onPendingCoverIndexChange,
  accent = "violet",
}: PlaceMediaEditorProps) {
  const router = useRouter();
  const [localFiles, setLocalFiles] =
    useState<File[]>([]);
  const [localCoverIndex, setLocalCoverIndex] =
    useState<number | null>(null);
  const [isBusy, setIsBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  const controlledPending = placeId === null;
  const files = controlledPending
    ? pendingFiles
    : localFiles;
  const coverIndex = controlledPending
    ? pendingCoverIndex
    : localCoverIndex;

  const [previewUrls, setPreviewUrls] =
    useState<Record<string, string>>({});
  const createdPreviewUrlsRef = useRef(
    new Set<string>(),
  );

  useEffect(() => {
    const createdPreviewUrls =
      createdPreviewUrlsRef.current;

    return () => {
      for (const url of createdPreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  function getFilePreviewKey(file: File) {
    return [
      file.name,
      file.size,
      file.lastModified,
      file.type,
    ].join("::");
  }

  const maximumNewFiles = Math.max(
    0,
    MAX_PLACE_IMAGE_COUNT -
      existingImages.length,
  );

  function updateFiles(
    nextFiles: File[],
    nextCoverIndex: number | null,
  ) {
    if (controlledPending) {
      onPendingFilesChange?.(nextFiles);
      onPendingCoverIndexChange?.(
        nextCoverIndex,
      );
      return;
    }

    setLocalFiles(nextFiles);
    setLocalCoverIndex(nextCoverIndex);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setMessage("");
    setError("");

    const incoming = Array.from(
      event.target.files ?? [],
    );
    event.target.value = "";

    if (incoming.length === 0) {
      return;
    }

    const invalidType = incoming.find(
      (file) =>
        !ALLOWED_IMAGE_TYPES.has(
          file.type,
        ),
    );

    if (invalidType) {
      setError(
        `Ảnh ${invalidType.name} không đúng định dạng. Chỉ hỗ trợ JPEG, PNG hoặc WebP.`,
      );
      return;
    }

    const tooLarge = incoming.find(
      (file) =>
        file.size > MAX_PLACE_IMAGE_BYTES,
    );

    if (tooLarge) {
      setError(
        `Ảnh ${tooLarge.name} vượt quá 6 MB.`,
      );
      return;
    }

    const remaining =
      maximumNewFiles - files.length;

    if (remaining <= 0) {
      setError(
        `Mỗi địa điểm tối đa ${MAX_PLACE_IMAGE_COUNT} ảnh.`,
      );
      return;
    }

    const accepted = incoming.slice(
      0,
      remaining,
    );

    const newPreviewUrls: Record<
      string,
      string
    > = {};

    for (const file of accepted) {
      const key = getFilePreviewKey(file);

      if (!previewUrls[key]) {
        const url = URL.createObjectURL(file);
        newPreviewUrls[key] = url;
        createdPreviewUrlsRef.current.add(url);
      }
    }

    if (Object.keys(newPreviewUrls).length > 0) {
      setPreviewUrls((current) => ({
        ...current,
        ...newPreviewUrls,
      }));
    }

    const next = [...files, ...accepted];
    const nextCover =
      coverIndex ??
      (existingImages.some(
        (image) => image.isCover,
      )
        ? null
        : next.length > 0
          ? 0
          : null);

    updateFiles(next, nextCover);

    if (accepted.length < incoming.length) {
      setError(
        `Chỉ nhận thêm ${accepted.length} ảnh vì giới hạn ${MAX_PLACE_IMAGE_COUNT} ảnh/địa điểm.`,
      );
    }
  }

  function removePending(index: number) {
    const nextFiles = files.filter(
      (_, itemIndex) =>
        itemIndex !== index,
    );

    let nextCoverIndex = coverIndex;

    if (coverIndex === index) {
      nextCoverIndex =
        nextFiles.length > 0 &&
        !existingImages.some(
          (image) => image.isCover,
        )
          ? 0
          : null;
    } else if (
      coverIndex !== null &&
      coverIndex > index
    ) {
      nextCoverIndex = coverIndex - 1;
    }

    updateFiles(
      nextFiles,
      nextCoverIndex,
    );
  }

  async function uploadSelected() {
    if (!placeId || files.length === 0) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    setError("");

    const result =
      await uploadPlaceMediaFiles({
        placeId,
        files,
        coverIndex,
      });

    if (!result.ok) {
      setError(result.message);
      setIsBusy(false);
      return;
    }

    setMessage(result.message);
    setLocalFiles([]);
    setLocalCoverIndex(null);
    setIsBusy(false);
    router.refresh();
  }

  async function setCover(imageId: string) {
    if (!placeId) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/place-media",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            placeId,
            imageId,
          }),
        },
      );
      const payload = (await response
        .json()
        .catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        setError(
          payload.message ??
            "Không thể đổi ảnh cover.",
        );
        return;
      }

      setMessage(
        payload.message ??
          "Đã đổi ảnh cover.",
      );
      router.refresh();
    } catch {
      setError(
        "Không thể kết nối để đổi ảnh cover.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteImage(imageId: string) {
    if (
      !placeId ||
      !window.confirm(
        "Xóa ảnh này khỏi địa điểm?",
      )
    ) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/place-media",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            placeId,
            imageId,
          }),
        },
      );
      const payload = (await response
        .json()
        .catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        setError(
          payload.message ??
            "Không thể xóa ảnh.",
        );
        return;
      }

      setMessage(
        payload.message ?? "Đã xóa ảnh.",
      );
      router.refresh();
    } catch {
      setError(
        "Không thể kết nối để xóa ảnh.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  const accentClasses =
    accent === "sky"
      ? {
          border: "border-sky-200",
          background: "bg-sky-50/60",
          button: "bg-sky-700 hover:bg-sky-800",
          text: "text-sky-800",
        }
      : {
          border: "border-violet-200",
          background: "bg-violet-50/60",
          button:
            "bg-violet-700 hover:bg-violet-800",
          text: "text-violet-800",
        };

  return (
    <div
      className={`rounded-2xl border ${accentClasses.border} ${accentClasses.background} p-3.5`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">
            Ảnh địa điểm
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Khuyến nghị ảnh ngang tỷ lệ 3:2, từ 1200 × 800 px trở lên. Hỗ trợ JPEG, PNG, WebP · tối đa 6 MB/ảnh · tối đa 8 ảnh/địa điểm.
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Ảnh dọc hoặc ảnh quá nhỏ vẫn có thể tải lên nhưng có thể bị cắt khi hiển thị trong lịch trình. Hãy chọn ảnh rõ nét và ưu tiên ảnh cover thể hiện toàn cảnh địa điểm.
          </p>
        </div>

        <span className={`rounded-full bg-white px-2.5 py-1 text-[11px] font-bold ${accentClasses.text}`}>
          {existingImages.length + files.length}/{MAX_PLACE_IMAGE_COUNT} ảnh
        </span>
      </div>

      {message ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
          {error}
        </p>
      ) : null}

      {existingImages.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {existingImages.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-xl border border-white bg-white shadow-sm"
            >
              <div
                role="img"
                aria-label={image.altText}
                className="aspect-[3/2] bg-slate-100 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${image.url}")`,
                }}
              />
              <div className="p-2">
                {image.isCover ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                    <Star
                      aria-hidden="true"
                      className="size-3"
                    />
                    COVER
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={
                      disabled ||
                      isBusy
                    }
                    onClick={() => {
                      void setCover(image.id);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Đặt cover
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    disabled || isBusy
                  }
                  onClick={() => {
                    void deleteImage(
                      image.id,
                    );
                  }}
                  className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2
                    aria-hidden="true"
                    className="size-3"
                  />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-3 text-xs text-slate-500">
          Chưa có ảnh nào. Nếu chưa chọn cover, ảnh đầu tiên được tải lên sẽ tự làm cover.
        </p>
      )}

      {files.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-bold text-slate-700">
            Ảnh mới đang chọn
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white"
              >
                <div
                  role="img"
                  aria-label={`Ảnh mới ${index + 1} của ${placeName || "địa điểm"}`}
                  className="aspect-[3/2] bg-slate-100 bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${previewUrls[getFilePreviewKey(file)] ?? ""}")`,
                  }}
                />
                <div className="p-2">
                  <p className="truncate text-[10px] text-slate-500">
                    {file.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateFiles(
                          files,
                          index,
                        );
                      }}
                      className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                        coverIndex === index
                          ? "bg-amber-50 text-amber-700"
                          : "border border-slate-200 text-slate-600"
                      }`}
                    >
                      {coverIndex === index
                        ? "Cover mới"
                        : "Chọn cover"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removePending(index);
                      }}
                      className="inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50"
                    >
                      <X
                        aria-hidden="true"
                        className="mr-1 size-3"
                      />
                      Bỏ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
          <ImagePlus
            aria-hidden="true"
            className="size-4"
          />
          Chọn ảnh
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={
              disabled ||
              isBusy ||
              maximumNewFiles <=
                files.length
            }
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {placeId && files.length > 0 ? (
          <button
            type="button"
            disabled={disabled || isBusy}
            onClick={() => {
              void uploadSelected();
            }}
            className={`min-h-10 rounded-xl px-3 text-xs font-bold text-white transition disabled:bg-slate-300 ${accentClasses.button}`}
          >
            {isBusy
              ? "Đang tải ảnh..."
              : `Tải ${files.length} ảnh lên`}
          </button>
        ) : null}

        {!placeId && files.length > 0 ? (
          <p className="text-[11px] leading-5 text-slate-500">
            Ảnh sẽ được tải lên ngay sau khi hồ sơ địa điểm được tạo thành công.
          </p>
        ) : null}
      </div>
    </div>
  );
}
