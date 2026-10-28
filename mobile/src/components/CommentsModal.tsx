import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { X, Send, Trash2, MessageCircle, LogIn, Lock } from "lucide-react-native";
import { useRouter } from "expo-router";
import Haptics from "../utils/haptics";
import { api, type SocialComment } from "../services/api";
import { useAuth } from "../context/auth";
import { COLORS, resolveMediaUrl } from "../constants/theme";

interface CommentsModalProps {
  visible: boolean;
  postId: string | null;
  postTitle?: string | null;
  onClose: () => void;
  onCommentCountChange?: (postId: string, newCount: number) => void;
}

export function CommentsModal({
  visible,
  postId,
  postTitle,
  onClose,
  onCommentCountChange,
}: CommentsModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [content, setContent] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && postId) {
      loadComments(postId);
    } else {
      setComments([]);
      setContent("");
    }
  }, [visible, postId]);

  const loadComments = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await api.getComments(id);
      setComments(data.comments || []);
    } catch (error) {
      console.warn("Failed to load comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim() || !postId) return;

    if (!user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (Platform.OS === "web") {
        const confirmLogin = window.confirm("Bạn cần đăng nhập để gửi bình luận. Bạn có muốn chuyển đến trang Đăng Nhập ngay bây giờ?");
        if (confirmLogin) {
          onClose();
          router.push("/(auth)/login");
        }
      } else {
        Alert.alert(
          "Yêu cầu đăng nhập",
          "Vui lòng đăng nhập để gửi bình luận và tương tác cùng cộng đồng.",
          [
            { text: "Để sau", style: "cancel" },
            {
              text: "Đăng nhập ngay",
              onPress: () => {
                onClose();
                router.push("/(auth)/login");
              },
            },
          ]
        );
      }
      return;
    }

    const commentText = content.trim();
    setContent("");
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic comment
    const optimisticId = "temp-" + Date.now();
    const optimisticComment: SocialComment = {
      id: optimisticId,
      postId,
      content: commentText,
      createdAt: new Date().toISOString(),
      authorName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Bạn",
      authorAvatarUrl: user.user_metadata?.avatar_url || null,
      isOwner: true,
      viewerCanManage: true,
    };

    setComments((prev) => [...prev, optimisticComment]);
    if (onCommentCountChange) {
      onCommentCountChange(postId, comments.length + 1);
    }

    try {
      const result = await api.addComment(postId, commentText);
      if (result.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticId ? result.comment : c))
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      const msg = error.message || "Không thể gửi bình luận.";
      if (Platform.OS === "web") {
        window.alert("Lỗi: " + msg);
      } else {
        Alert.alert("Lỗi gửi bình luận", msg);
      }
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      if (onCommentCountChange) {
        onCommentCountChange(postId, comments.length);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const performDelete = async () => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (postId && onCommentCountChange) {
        onCommentCountChange(postId, Math.max(0, comments.length - 1));
      }
      try {
        await api.deleteComment(commentId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        if (postId) loadComments(postId);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Bạn có chắc muốn xóa bình luận này?")) {
        performDelete();
      }
    } else {
      Alert.alert("Xóa bình luận", "Bạn có chắc muốn xóa bình luận này?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: performDelete,
        },
      ]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/85 justify-end">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85%] flex-1 mt-20"
        >
          {/* Header */}
          <View className="px-5 py-4 border-b border-slate-800 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MessageCircle size={20} color={COLORS.primary} />
              <Text className="text-white font-black text-base ml-2">
                Bình luận ({comments.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="bg-slate-800 p-2 rounded-full active:bg-slate-700"
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Login Banner for Guests */}
          {!user && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push("/(auth)/login");
              }}
              className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <Lock size={14} color="#34D399" />
                <Text className="text-emerald-300 text-xs font-semibold ml-2">
                  Bạn đang ở chế độ khách. Đăng nhập để gửi bình luận.
                </Text>
              </View>
              <View className="bg-emerald-500 px-2.5 py-1 rounded-lg flex-row items-center">
                <LogIn size={12} color="#020617" />
                <Text className="text-slate-950 font-black text-[11px] ml-1">Đăng nhập</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Body Comments List */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center p-8">
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text className="text-slate-400 text-xs mt-3 font-semibold">
                Đang tải danh sách bình luận...
              </Text>
            </View>
          ) : comments.length === 0 ? (
            <View className="flex-1 items-center justify-center p-8">
              <MessageCircle size={40} color="#334155" />
              <Text className="text-slate-300 font-bold text-sm mt-3">
                Chưa có bình luận nào
              </Text>
              <Text className="text-slate-500 text-xs text-center mt-1">
                Hãy là người đầu tiên chia sẻ cảm nghĩ về chuyến đi này!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              renderItem={({ item }) => {
                const commentDate = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Vừa xong";

                const authorName =
                  item.authorName ||
                  item.author?.displayName ||
                  "Thành viên VTrip";

                const avatarUrl = resolveMediaUrl(
                  item.authorAvatarUrl || item.author?.avatarUrl
                );

                const canDelete = item.isOwner || item.viewerCanManage;

                return (
                  <View className="flex-row items-start mb-3.5 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
                    {/* Avatar */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#064E3B",
                        borderWidth: 1,
                        borderColor: "rgba(16, 185, 129, 0.3)",
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {avatarUrl ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : (
                        <Text className="text-emerald-400 font-black text-xs">
                          {authorName.charAt(0) || "U"}
                        </Text>
                      )}
                    </View>

                    {/* Content */}
                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-white font-bold text-xs">
                          {authorName}
                        </Text>
                        <Text className="text-slate-500 text-[10px]">
                          {commentDate}
                        </Text>
                      </View>
                      <Text className="text-slate-200 text-xs mt-1 leading-5">
                        {item.content}
                      </Text>
                    </View>

                    {/* Delete action */}
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        className="ml-2 p-1.5 rounded-lg bg-red-950/40 border border-red-500/20"
                      >
                        <Trash2 size={13} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}

          {/* Input Bar */}
          <View className="p-3 bg-slate-950 border-t border-slate-800 flex-row items-center">
            <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex-row items-center mr-2">
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder={user ? "Viết bình luận của bạn..." : "Đăng nhập để gửi bình luận..."}
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-xs font-medium"
                multiline
                maxLength={500}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={isSending || !content.trim()}
              className={`w-11 h-11 rounded-2xl items-center justify-center ${
                content.trim() ? "bg-emerald-500 shadow-md shadow-emerald-500/25" : "bg-slate-800 opacity-50"
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#020617" />
              ) : (
                <Send size={18} color={content.trim() ? "#020617" : "#94A3B8"} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
