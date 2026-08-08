"use client";

import {
  useEffect,
  useState,
} from "react";

import type { PublicSocialFeedMedia } from "@/lib/social-feed/public-feed";

type SocialPostMediaGalleryProps = {
  media: PublicSocialFeedMedia[];
};

type ImageTileProps = {
  image: PublicSocialFeedMedia;
  className?: string;
  extraCount?: number;
  onOpen: () => void;
};

function ImageTile({
  image,
  className = "",
  extraCount = 0,
  onOpen,
}: ImageTileProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        extraCount > 0
          ? `Xem ${image.altText} và ${extraCount} ảnh khác`
          : `Xem ${image.altText}`
      }
      className={`relative min-h-0 overflow-hidden bg-slate-100 bg-cover bg-center transition hover:brightness-95 ${className}`}
      style={{
        backgroundImage: `url("${image.url}")`,
      }}
    >
      {extraCount > 0 ? (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-3xl font-semibold text-white sm:text-4xl">
          +{extraCount}
        </span>
      ) : null}
    </button>
  );
}

export function SocialPostMediaGallery({
  media,
}: SocialPostMediaGalleryProps) {
  const images = media.filter(
    (item) => item.type === "IMAGE",
  );
  const video =
    media.find(
      (item) => item.type === "VIDEO",
    ) ?? null;

  const [activeImageIndex, setActiveImageIndex] =
    useState<number | null>(null);

  useEffect(() => {
    if (activeImageIndex === null) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setActiveImageIndex(null);
        return;
      }

      if (
        event.key === "ArrowLeft" &&
        images.length > 1
      ) {
        setActiveImageIndex((current) =>
          current === null
            ? 0
            : (current - 1 + images.length) %
              images.length,
        );
      }

      if (
        event.key === "ArrowRight" &&
        images.length > 1
      ) {
        setActiveImageIndex((current) =>
          current === null
            ? 0
            : (current + 1) %
              images.length,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
      document.body.style.overflow =
        previousOverflow;
    };
  }, [activeImageIndex, images.length]);

  if (video) {
    return (
      <div className="border-y border-slate-100 bg-slate-950">
        <video
          controls
          preload="metadata"
          className="mx-auto max-h-[70svh] w-full object-contain sm:max-h-[620px]"
          aria-label={video.altText}
        >
          <source
            src={video.url}
            type={video.mimeType ?? undefined}
          />
          Trình duyệt của bạn chưa hỗ trợ phát video.
        </video>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  const visibleImages =
    images.slice(0, 4);
  const extraCount = Math.max(
    0,
    images.length - 4,
  );
  const activeImage =
    activeImageIndex === null
      ? null
      : images[activeImageIndex] ?? null;

  return (
    <>
      {images.length === 1 ? (
        <ImageTile
          image={images[0]}
          onOpen={() =>
            setActiveImageIndex(0)
          }
          className="aspect-[16/10] w-full"
        />
      ) : null}

      {images.length === 2 ? (
        <div className="grid h-[260px] grid-cols-2 gap-1 bg-white sm:h-[460px]">
          {images.map((image, index) => (
            <ImageTile
              key={image.id}
              image={image}
              onOpen={() =>
                setActiveImageIndex(index)
              }
              className="h-full w-full"
            />
          ))}
        </div>
      ) : null}

      {images.length === 3 ? (
        <div className="grid h-[260px] grid-cols-3 grid-rows-2 gap-1 bg-white sm:h-[460px]">
          <ImageTile
            image={images[0]}
            onOpen={() =>
              setActiveImageIndex(0)
            }
            className="col-span-2 row-span-2 h-full w-full"
          />
          <ImageTile
            image={images[1]}
            onOpen={() =>
              setActiveImageIndex(1)
            }
            className="h-full w-full"
          />
          <ImageTile
            image={images[2]}
            onOpen={() =>
              setActiveImageIndex(2)
            }
            className="h-full w-full"
          />
        </div>
      ) : null}

      {images.length >= 4 ? (
        <div className="grid h-[260px] grid-cols-2 grid-rows-2 gap-1 bg-white sm:h-[460px]">
          {visibleImages.map(
            (image, index) => (
              <ImageTile
                key={image.id}
                image={image}
                onOpen={() =>
                  setActiveImageIndex(index)
                }
                extraCount={
                  index === 3
                    ? extraCount
                    : 0
                }
                className="h-full w-full"
              />
            ),
          )}
        </div>
      ) : null}

      {activeImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh bài đăng"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-2 sm:p-4"
        >
          <button
            type="button"
            onClick={() =>
              setActiveImageIndex(null)
            }
            aria-label="Đóng xem ảnh"
            className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:right-4 sm:top-4"
          >
            ×
          </button>

          {images.length > 1 ? (
            <button
              type="button"
              onClick={() =>
                setActiveImageIndex(
                  (current) =>
                    current === null
                      ? 0
                      : (current -
                            1 +
                            images.length) %
                          images.length,
                )
              }
              aria-label="Ảnh trước"
              className="absolute left-3 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:left-6"
            >
              ‹
            </button>
          ) : null}

          <div
            role="img"
            aria-label={activeImage.altText}
            className="h-[78svh] w-full max-w-6xl bg-contain bg-center bg-no-repeat sm:h-[82vh] sm:w-[86vw]"
            style={{
              backgroundImage: `url("${activeImage.url}")`,
            }}
          />

          {images.length > 1 ? (
            <button
              type="button"
              onClick={() =>
                setActiveImageIndex(
                  (current) =>
                    current === null
                      ? 0
                      : (current + 1) %
                        images.length,
                )
              }
              aria-label="Ảnh tiếp theo"
              className="absolute right-3 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:right-6"
            >
              ›
            </button>
          ) : null}

          <div className="absolute bottom-5 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white">
            {(activeImageIndex ?? 0) + 1}/
            {images.length}
          </div>
        </div>
      ) : null}
    </>
  );
}
