import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Image as ImageIcon, Play, X } from "lucide-react-native";

import type { SocialFeedItem } from "../../services/api";
import { resolveMediaUrl } from "../../constants/theme";
import Haptics from "../../utils/haptics";

const FALLBACK_TRAVEL_IMAGES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
];

const GRID_GAP = 2;
const MAX_GRID_TILES = 4;

export type PostMediaItem = {
  key: string;
  type: "IMAGE" | "VIDEO";
  uri: string | null;
  alt: string | null;
};

/**
 * Gom media của bài viết thành danh sách hiển thị. Nếu bài không có media
 * riêng thì dùng ảnh bìa; nếu ảnh bìa cũng trống thì dùng ảnh dự phòng.
 */
export function buildPostMediaItems(post: SocialFeedItem, index: number): PostMediaItem[] {
  const media = [...(post.media ?? [])]
    .filter((item) => Boolean(item.url))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (media.length > 0) {
    return media.map((item) => ({
      key: item.id,
      type: item.type === "VIDEO" ? "VIDEO" : "IMAGE",
      uri: resolveMediaUrl(item.url),
      alt: item.altText ?? null,
    }));
  }

  return [
    {
      key: `${post.id}-cover`,
      type: "IMAGE",
      uri:
        resolveMediaUrl(post.coverImageUrl) ||
        FALLBACK_TRAVEL_IMAGES[index % FALLBACK_TRAVEL_IMAGES.length],
      alt: post.coverImageAlt ?? null,
    },
  ];
}

function MediaTile({
  item,
  height,
  fallbackIndex,
  contentFit = "cover",
}: {
  item: PostMediaItem;
  height: number | "100%";
  fallbackIndex: number;
  contentFit?: "cover" | "contain";
}) {
  const fallbackUri = FALLBACK_TRAVEL_IMAGES[fallbackIndex % FALLBACK_TRAVEL_IMAGES.length];
  const [activeUri, setActiveUri] = useState<string>(item.uri || fallbackUri);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setActiveUri(item.uri || fallbackUri);
    setIsLoaded(false);
  }, [item.uri, fallbackUri]);

  if (item.type === "VIDEO") {
    return (
      <View
        style={{
          width: "100%",
          height,
          backgroundColor: "#0B1329",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "rgba(16,185,129,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Play size={24} color="#020617" fill="#020617" />
        </View>
        <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700", marginTop: 8 }}>
          Video
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: "100%", height, backgroundColor: "#020617", overflow: "hidden" }}>
      {!isLoaded && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0B1329",
          }}
        >
          <ImageIcon size={24} color="#334155" />
        </View>
      )}
      <Image
        source={{ uri: activeUri }}
        style={{ width: "100%", height: "100%" }}
        contentFit={contentFit}
        transition={200}
        cachePolicy="memory-disk"
        accessibilityLabel={item.alt || "Ảnh bài viết"}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (activeUri !== fallbackUri) setActiveUri(fallbackUri);
        }}
      />
    </View>
  );
}

function GridCell({
  item,
  height,
  index,
  fallbackIndex,
  overlayCount,
  onPress,
}: {
  item: PostMediaItem;
  height: number;
  index: number;
  fallbackIndex: number;
  overlayCount?: number;
  onPress: (index: number) => void;
}) {
  return (
    <Pressable onPress={() => onPress(index)} style={{ flex: 1, height }}>
      <MediaTile item={item} height={height} fallbackIndex={fallbackIndex + index} />
      {overlayCount ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(2,6,23,0.6)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "900" }}>+{overlayCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Lưới ảnh kiểu Facebook: 1 ảnh full, 2 ảnh chia đôi, 3 ảnh (1 lớn + 2 nhỏ),
 * 4+ ảnh dạng 2x2 với lớp phủ "+N" ở ô cuối. Bấm vào ảnh để mở trình xem.
 */
export function PostMediaGrid({ post, index }: { post: SocialFeedItem; index: number }) {
  const items = buildPostMediaItems(post, index);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const open = (i: number) => {
    Haptics.selectionAsync();
    setViewerIndex(i);
  };

  let grid: React.ReactNode;

  if (items.length === 1) {
    grid = (
      <Pressable onPress={() => open(0)}>
        <MediaTile item={items[0]} height={280} fallbackIndex={index} />
      </Pressable>
    );
  } else if (items.length === 2) {
    grid = (
      <View style={{ flexDirection: "row", gap: GRID_GAP }}>
        {items.map((item, i) => (
          <GridCell key={item.key} item={item} height={220} index={i} fallbackIndex={index} onPress={open} />
        ))}
      </View>
    );
  } else if (items.length === 3) {
    const smallHeight = (280 - GRID_GAP) / 2;
    grid = (
      <View style={{ flexDirection: "row", gap: GRID_GAP, height: 280 }}>
        <View style={{ flex: 2 }}>
          <GridCell item={items[0]} height={280} index={0} fallbackIndex={index} onPress={open} />
        </View>
        <View style={{ flex: 1, gap: GRID_GAP }}>
          <GridCell item={items[1]} height={smallHeight} index={1} fallbackIndex={index} onPress={open} />
          <GridCell item={items[2]} height={smallHeight} index={2} fallbackIndex={index} onPress={open} />
        </View>
      </View>
    );
  } else {
    const visible = items.slice(0, MAX_GRID_TILES);
    const hiddenCount = items.length - MAX_GRID_TILES;
    const rows = [visible.slice(0, 2), visible.slice(2, 4)];
    grid = (
      <View style={{ gap: GRID_GAP }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: GRID_GAP }}>
            {row.map((item, i) => {
              const absoluteIndex = rowIndex * 2 + i;
              const isLast = absoluteIndex === MAX_GRID_TILES - 1;
              return (
                <GridCell
                  key={item.key}
                  item={item}
                  height={150}
                  index={absoluteIndex}
                  fallbackIndex={index}
                  overlayCount={isLast && hiddenCount > 0 ? hiddenCount : undefined}
                  onPress={open}
                />
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ width: "100%", backgroundColor: "#020617" }}>
      {grid}
      {items.length > 1 && (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(2,6,23,0.75)",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
          }}
          pointerEvents="none"
        >
          <Text style={{ color: "#E2E8F0", fontSize: 10, fontWeight: "800" }}>{items.length} ảnh/video</Text>
        </View>
      )}
      <MediaViewerModal
        items={items}
        initialIndex={viewerIndex}
        fallbackIndex={index}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

function MediaViewerModal({
  items,
  initialIndex,
  fallbackIndex,
  onClose,
}: {
  items: PostMediaItem[];
  initialIndex: number | null;
  fallbackIndex: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (initialIndex !== null) setCurrent(initialIndex);
  }, [initialIndex]);

  const visible = initialIndex !== null;
  const mediaHeight = Math.max(240, height - insets.top - insets.bottom - 120);

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 16,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: "#E2E8F0", fontSize: 13, fontWeight: "800" }}>
            {current + 1} / {items.length}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Đóng trình xem ảnh"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#1E293B",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {visible && (
          <FlatList
            data={items}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            initialScrollIndex={initialIndex ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrent(Math.min(Math.max(next, 0), items.length - 1));
            }}
            onScroll={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / width);
              if (next !== current && next >= 0 && next < items.length) setCurrent(next);
            }}
            scrollEventThrottle={64}
            renderItem={({ item, index: i }) => (
              <View style={{ width, height: mediaHeight, alignItems: "center", justifyContent: "center" }}>
                {item.type === "VIDEO" ? (
                  <TouchableOpacity
                    onPress={() => item.uri && Linking.openURL(item.uri)}
                    style={{ alignItems: "center" }}
                  >
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: "#10B981",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Play size={32} color="#020617" fill="#020617" />
                    </View>
                    <Text style={{ color: "#E2E8F0", fontSize: 13, fontWeight: "700", marginTop: 12 }}>
                      Mở video
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width, height: mediaHeight }}>
                    <MediaTile item={item} height={mediaHeight} fallbackIndex={fallbackIndex + i} contentFit="contain" />
                  </View>
                )}
              </View>
            )}
          />
        )}

        {items[current]?.alt ? (
          <Text
            style={{
              color: "#94A3B8",
              fontSize: 12,
              textAlign: "center",
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 16,
            }}
          >
            {items[current]?.alt}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}
