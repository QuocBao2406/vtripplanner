import React, { useState } from "react";
import { View, Text, TouchableOpacity, Pressable, Modal, Platform, Share } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  MessageCircle,
  Bookmark,
  MapPin,
  ChevronRight,
  Share2,
  ShieldCheck,
  User,
  ThumbsUp,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react-native";

import { api, type SocialFeedItem, type SocialReactionType } from "../../services/api";
import { useAuth } from "../../context/auth";
import { API_BASE_URL, COLORS, resolveMediaUrl } from "../../constants/theme";
import Haptics from "../../utils/haptics";
import { confirmAction, showMessage } from "../../utils/dialog";
import { emitPostPatch, emitPostRemoved } from "../../lib/postEvents";
import { PostMediaGrid } from "./PostMediaGrid";
import { EditPostModal } from "./EditPostModal";

export const REACTIONS: Array<{
  type: SocialReactionType;
  emoji: string;
  label: string;
  color: string;
}> = [
  { type: "LIKE", emoji: "👍", label: "Thích", color: "#38BDF8" },
  { type: "LOVE", emoji: "❤️", label: "Yêu thích", color: "#F43F5E" },
  { type: "WOW", emoji: "😮", label: "Wow", color: "#F59E0B" },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_CAPTION_LENGTH = 220;

/** Bài mock offline có id không phải UUID nên chỉ cập nhật cục bộ, không gọi API. */
function isLivePost(postId: string): boolean {
  return UUID_PATTERN.test(postId);
}

export function isEditorialPost(post: SocialFeedItem): boolean {
  return (
    Boolean(post.isSystemPost) ||
    post.type === "SEASONAL_GUIDE" ||
    post.type === "EVERGREEN_GUIDE" ||
    Boolean(post.sourceName?.includes("Admin")) ||
    Boolean(post.sourceName?.includes("Ban Biên Tập")) ||
    Boolean(post.sourceName?.includes("Ban Quản Trị"))
  );
}

export function getPostShareUrl(postId: string): string {
  return `${API_BASE_URL}/?focusPost=${encodeURIComponent(postId)}`;
}

type PostCardProps = {
  post: SocialFeedItem;
  index: number;
  onOpenComments: (post: SocialFeedItem) => void;
};

/**
 * Mọi thay đổi trên bài được phát qua `postEvents`, nên màn hình chứa thẻ
 * phải gọi `useSyncedPosts(setPosts)` để nhận cập nhật.
 */
export function PostCard({ post, index, onOpenComments }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAdminPost = isEditorialPost(post);
  const activeReaction = REACTIONS.find((r) => r.type === post.viewerReaction) ?? null;
  const isSaved = Boolean(post.viewerSaved);
  const canManage = Boolean(post.viewerCanManage) && isLivePost(post.id);

  const postDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Vừa xong";

  const ensureLoggedIn = async (actionLabel: string): Promise<boolean> => {
    if (user) return true;
    const goLogin = await confirmAction(
      "Cần đăng nhập",
      `Bạn cần đăng nhập để ${actionLabel}. Chuyển đến trang Đăng nhập?`,
      { confirmLabel: "Đăng nhập" },
    );
    if (goLogin) router.push("/(auth)/login");
    return false;
  };

  const applyReaction = async (next: SocialReactionType | null) => {
    setIsPickerOpen(false);
    if (!(await ensureLoggedIn("thả cảm xúc"))) return;

    const previousReaction = post.viewerReaction;
    const previousCount = post.reactionCount || 0;
    if (previousReaction === next) return;

    const delta = previousReaction === null ? 1 : next === null ? -1 : 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    emitPostPatch(post.id, {
      viewerReaction: next,
      reactionCount: Math.max(0, previousCount + delta),
    });

    if (!isLivePost(post.id)) return;

    try {
      const result = await api.setReaction(post.id, next);
      emitPostPatch(post.id, {
        viewerReaction: result.reactionType,
        reactionCount: result.reactionCount,
      });
    } catch (error: any) {
      emitPostPatch(post.id, { viewerReaction: previousReaction, reactionCount: previousCount });
      showMessage("Không thể thả cảm xúc", error?.message || "Vui lòng thử lại sau.");
    }
  };

  const handleQuickReact = () => {
    if (isPickerOpen) {
      setIsPickerOpen(false);
      return;
    }
    applyReaction(post.viewerReaction ? null : "LIKE");
  };

  const handleOpenPicker = () => {
    Haptics.selectionAsync();
    setIsPickerOpen(true);
  };

  const handleSave = async () => {
    if (!(await ensureLoggedIn("lưu bài viết"))) return;

    const next = !isSaved;
    Haptics.selectionAsync();
    emitPostPatch(post.id, { viewerSaved: next });

    if (!isLivePost(post.id)) return;

    try {
      await api.setSaved(post.id, next);
    } catch (error: any) {
      emitPostPatch(post.id, { viewerSaved: !next });
      showMessage(next ? "Không thể lưu bài" : "Không thể bỏ lưu", error?.message || "Vui lòng thử lại sau.");
    }
  };

  const handleShare = async () => {
    Haptics.selectionAsync();
    const url = getPostShareUrl(post.id);
    const title = post.headline || "Chia sẻ từ VTripPlanner";
    const excerpt = (post.caption || "").slice(0, 160);
    const message = [post.headline, excerpt, url].filter(Boolean).join("\n\n");

    try {
      if (Platform.OS === "web") {
        const nav: any = typeof navigator !== "undefined" ? navigator : null;
        if (nav?.share) {
          await nav.share({ title, text: excerpt, url });
          return;
        }
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(url);
          showMessage("Đã sao chép liên kết", url);
          return;
        }
        showMessage("Liên kết bài viết", url);
        return;
      }

      await Share.share({ title, message, url });
    } catch {
      // Người dùng hủy chia sẻ, không cần báo lỗi.
    }
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    const confirmed = await confirmAction(
      "Xóa bài viết",
      "Bài viết sẽ bị gỡ khỏi bảng tin và không thể khôi phục. Bạn chắc chắn muốn xóa?",
      { confirmLabel: "Xóa", destructive: true },
    );
    if (!confirmed) return;

    try {
      await api.deletePost(post.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      emitPostRemoved(post.id);
    } catch (error: any) {
      showMessage("Không thể xóa bài viết", error?.message || "Vui lòng thử lại sau.");
    }
  };

  const caption = post.caption || "";
  const isLongCaption = caption.length > LONG_CAPTION_LENGTH;

  return (
    <View className="bg-slate-900 mx-3 my-2.5 rounded-3xl border border-slate-800 overflow-hidden shadow-sm">
      {/* Author Header */}
      <View className="p-3.5 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: isAdminPost ? "#78350F" : "#064E3B",
              borderWidth: 1.5,
              borderColor: isAdminPost ? "#F59E0B" : "#10B981",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {post.sourceAvatarUrl ? (
              <Image
                source={{ uri: resolveMediaUrl(post.sourceAvatarUrl) || "" }}
                style={{ width: 42, height: 42 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <Text className="text-white font-black text-sm">
                {isAdminPost ? "A" : post.sourceName?.charAt(0) || "U"}
              </Text>
            )}
          </View>

          <View className="ml-2.5 flex-1">
            <View className="flex-row items-center flex-wrap">
              <Text className="text-white font-bold text-sm mr-2" numberOfLines={1}>
                {post.sourceName || (isAdminPost ? "Ban Biên Tập VTrip" : "Du khách VTrip")}
              </Text>

              {isAdminPost ? (
                <View className="bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full flex-row items-center">
                  <ShieldCheck size={11} color="#F59E0B" />
                  <Text className="text-amber-400 text-[10px] font-black ml-1">Admin</Text>
                </View>
              ) : (
                <View className="bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full flex-row items-center">
                  <User size={10} color="#38BDF8" />
                  <Text className="text-sky-300 text-[10px] font-semibold ml-1">Thành viên</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center mt-0.5">
              <Text className="text-slate-400 text-[11px]">{postDate} • </Text>
              <Text className={`text-[11px] font-bold ${isAdminPost ? "text-amber-400" : "text-sky-400"}`}>
                {isAdminPost ? "Cẩm nang & Giới thiệu du lịch" : "Trải nghiệm chuyến đi"}
              </Text>
            </View>
          </View>
        </View>

        {canManage && (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setIsMenuOpen(true);
            }}
            accessibilityLabel="Tùy chọn bài viết"
            className="w-9 h-9 rounded-full items-center justify-center active:bg-slate-800"
          >
            <MoreHorizontal size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Media */}
      <PostMediaGrid post={post} index={index} />

      {/* Content */}
      <View className="p-4">
        {post.headline ? (
          <Text className="text-white font-black text-base mb-1.5 leading-6">{post.headline}</Text>
        ) : null}

        {caption ? (
          <View className="mb-3">
            <Text className="text-slate-300 text-xs leading-5" numberOfLines={isCaptionExpanded ? undefined : 4}>
              {caption}
            </Text>
            {isLongCaption && (
              <TouchableOpacity onPress={() => setIsCaptionExpanded((v) => !v)} className="mt-1 self-start">
                <Text className="text-emerald-400 text-xs font-bold">
                  {isCaptionExpanded ? "Thu gọn" : "Xem thêm"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {post.places && post.places.length > 0 && (
          <View className="mb-3">
            <Text className="text-slate-400 text-[11px] font-bold mb-2">📍 Địa điểm trong bài viết:</Text>
            {post.places.map((place) => (
              <View
                key={place.id}
                className="bg-slate-950/90 border border-emerald-500/35 rounded-2xl p-3 mb-2 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center mr-2.5">
                    <MapPin size={16} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-xs" numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text className="text-emerald-400 text-[11px] font-medium mt-0.5" numberOfLines={1}>
                      {place.provinceName ? `📍 ${place.provinceName}` : "Điểm đến nổi bật"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/places/${place.id}` as any);
                  }}
                  activeOpacity={0.8}
                  className="bg-emerald-500 active:bg-emerald-600 px-3.5 py-1.5 rounded-xl flex-row items-center"
                >
                  <Text className="text-slate-950 font-black text-xs mr-0.5">Chi tiết</Text>
                  <ChevronRight size={14} color="#020617" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Reaction picker */}
        {isPickerOpen && (
          <View className="flex-row self-start bg-slate-950 border border-slate-700 rounded-full px-2 py-1.5 mb-2 shadow-lg">
            {REACTIONS.map((reaction) => {
              const isActive = post.viewerReaction === reaction.type;
              return (
                <TouchableOpacity
                  key={reaction.type}
                  onPress={() => applyReaction(isActive ? null : reaction.type)}
                  accessibilityLabel={reaction.label}
                  className={`items-center px-2.5 py-1 rounded-full ${isActive ? "bg-slate-800" : ""}`}
                >
                  <Text style={{ fontSize: 24 }}>{reaction.emoji}</Text>
                  <Text style={{ color: reaction.color, fontSize: 9, fontWeight: "800", marginTop: 1 }}>
                    {reaction.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Interaction Bar */}
        <View className="flex-row items-center justify-between pt-3 border-t border-slate-800/80">
          <View className="flex-row items-center">
            <Pressable
              onPress={handleQuickReact}
              onLongPress={handleOpenPicker}
              delayLongPress={300}
              accessibilityLabel="Thả cảm xúc. Nhấn giữ để chọn loại cảm xúc"
              className="flex-row items-center p-1"
            >
              {activeReaction ? (
                <Text style={{ fontSize: 17 }}>{activeReaction.emoji}</Text>
              ) : (
                <ThumbsUp size={18} color="#94A3B8" />
              )}
              <Text
                style={{ color: activeReaction?.color ?? "#94A3B8" }}
                className="text-xs font-bold ml-1.5"
              >
                {activeReaction?.label ?? "Thích"} · {post.reactionCount || 0}
              </Text>
            </Pressable>

            <TouchableOpacity
              onPress={handleOpenPicker}
              accessibilityLabel="Chọn cảm xúc khác"
              className="ml-1 px-1.5 py-1 rounded-lg active:bg-slate-800"
            >
              <Text style={{ fontSize: 12 }}>😮❤️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onOpenComments(post);
              }}
              className="flex-row items-center ml-3 p-1 active:opacity-70"
            >
              <MessageCircle size={18} color="#94A3B8" />
              <Text className="text-slate-400 text-xs font-bold ml-1.5">{post.commentCount || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShare} accessibilityLabel="Chia sẻ" className="ml-3 p-1 active:opacity-70">
              <Share2 size={17} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleSave} accessibilityLabel={isSaved ? "Bỏ lưu" : "Lưu bài viết"} className="p-1">
            <Bookmark
              size={20}
              color={isSaved ? COLORS.primary : "#94A3B8"}
              fill={isSaved ? COLORS.primary : "transparent"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Manage menu */}
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <Pressable
          onPress={() => setIsMenuOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.7)", justifyContent: "flex-end" }}
        >
          <Pressable onPress={() => {}} className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-4 pb-8">
            <Text className="text-slate-400 text-xs font-bold mb-3 text-center">Quản lý bài viết</Text>
            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                setIsEditing(true);
              }}
              className="flex-row items-center p-3.5 rounded-2xl bg-slate-800/60 mb-2"
            >
              <Pencil size={18} color="#E2E8F0" />
              <Text className="text-white font-bold text-sm ml-3">Chỉnh sửa nội dung</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 mb-2"
            >
              <Trash2 size={18} color="#F87171" />
              <Text className="text-red-400 font-bold text-sm ml-3">Xóa bài viết</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsMenuOpen(false)} className="p-3 items-center">
              <Text className="text-slate-400 font-bold text-sm">Hủy</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <EditPostModal
        visible={isEditing}
        postId={post.id}
        initialCaption={caption}
        onClose={() => setIsEditing(false)}
        onSaved={(postId, newCaption) => emitPostPatch(postId, { caption: newCaption })}
      />
    </View>
  );
}
