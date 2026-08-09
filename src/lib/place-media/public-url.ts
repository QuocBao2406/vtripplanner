export const PLACE_IMAGE_BUCKET = "place-images";

export function getPublicPlaceImageUrl(
  storagePath: string | null,
): string | null {
  if (!storagePath) {
    return null;
  }

  if (
    storagePath.startsWith("/") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("http://")
  ) {
    return storagePath;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
      /\/+$/,
      "",
    );

  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${PLACE_IMAGE_BUCKET}/${encodedPath}`;
}
