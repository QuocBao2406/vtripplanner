import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Bookmark, FileText, LogIn, Plus, RefreshCw } from "lucide-react-native";

import { api, type SocialFeedItem } from "../../services/api";
import { useAuth } from "../../context/auth";
import { COLORS } from "../../constants/theme";
import Haptics from "../../utils/haptics";
import { CommentsModal } from "../CommentsModal";
import { PostComposerModal } from "../PostComposerModal";
import { PostCard } from "./PostCard";
import { emitPostPatch, useSyncedPosts } from "../../lib/postEvents";

type PostListMode = "mine" | "saved";

const COPY: Record<
  PostListMode,
  {
    loginMessage: string;
    emptyTitle: string;
    emptyDescription: string;
    summary: (count: number) => string;
  }
> = {
  mine: {
    loginMessage: "Đăng nhập để xem và quản lý các bài chia sẻ của bạn.",
    emptyTitle: "Bạn chưa có bài viết nào",
    emptyDescription: "Hãy chia sẻ một chuyến đi hoặc địa điểm yêu thích với cộng đồng VTripPlanner.",
    summary: (count) => `${count} bài viết đang hiển thị trên bảng tin. Bấm ⋯ để sửa hoặc xóa.`,
  },
  saved: {
    loginMessage: "Đăng nhập để xem bộ sưu tập bài viết bạn đã lưu.",
    emptyTitle: "Chưa lưu bài viết nào",
    emptyDescription: "Bấm biểu tượng dấu trang trên bài viết ở Bảng tin để lưu lại đọc sau.",
    summary: (count) => `${count} bài viết đã lưu. Bỏ dấu trang để gỡ khỏi bộ sưu tập.`,
  },
};

export function PostListScreen({ mode }: { mode: PostListMode }) {
  const router = useRouter();
  const { user } = useAuth();
  const copy = COPY[mode];

  const [posts, setPosts] = useState<SocialFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentsPost, setCommentsPost] = useState<SocialFeedItem | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const data = mode === "mine" ? await api.getMyPosts() : await api.getSavedPosts();
      setPosts(data);
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error?.message || "Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [mode, user]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPosts();
  };

  useSyncedPosts(setPosts);

  const handleCommentCountChange = useCallback((postId: string, count: number) => {
    emitPostPatch(postId, { commentCount: count });
  }, []);

  const EmptyIcon = mode === "mine" ? FileText : Bookmark;

  if (!user) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-6">
        <EmptyIcon size={44} color="#334155" />
        <Text className="text-white font-bold text-base mt-3 text-center">Bạn chưa đăng nhập</Text>
        <Text className="text-slate-400 text-xs mt-1 text-center">{copy.loginMessage}</Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="mt-4 bg-emerald-500 px-5 py-2.5 rounded-xl flex-row items-center"
        >
          <LogIn size={15} color="#020617" />
          <Text className="text-slate-950 font-black text-xs ml-1.5">Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-slate-400 text-xs mt-3 font-semibold">Đang tải bài viết...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View className="px-4 pt-4 pb-1 flex-row items-center justify-between">
      <Text className="text-slate-400 text-xs flex-1 mr-3">{copy.summary(posts.length)}</Text>
      {mode === "mine" && (
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setIsComposerOpen(true);
          }}
          className="bg-emerald-500 px-3 py-1.5 rounded-xl flex-row items-center"
        >
          <Plus size={14} color="#020617" />
          <Text className="text-slate-950 font-black text-xs ml-1">Đăng bài</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View className="items-center justify-center p-8 mt-10">
      {errorMessage ? (
        <>
          <RefreshCw size={40} color="#334155" />
          <Text className="text-white font-bold text-base mt-3 text-center">Không tải được dữ liệu</Text>
          <Text className="text-slate-400 text-xs mt-1 text-center">{errorMessage}</Text>
          <TouchableOpacity onPress={handleRefresh} className="mt-4 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl">
            <Text className="text-slate-100 font-bold text-xs">Thử lại</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <EmptyIcon size={44} color="#334155" />
          <Text className="text-white font-bold text-base mt-3 text-center">{copy.emptyTitle}</Text>
          <Text className="text-slate-400 text-xs mt-1 text-center">{copy.emptyDescription}</Text>
          <TouchableOpacity
            onPress={() => (mode === "mine" ? setIsComposerOpen(true) : router.push("/(tabs)"))}
            className="mt-4 bg-emerald-500 px-4 py-2 rounded-xl"
          >
            <Text className="text-slate-950 font-black text-xs">
              {mode === "mine" ? "Chia sẻ chuyến đi" : "Khám phá bảng tin"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-slate-950">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            index={index}
            onOpenComments={setCommentsPost}
          />
        )}
        ListHeaderComponent={posts.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 36, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      />

      <CommentsModal
        visible={Boolean(commentsPost)}
        postId={commentsPost?.id || null}
        postTitle={commentsPost?.headline || commentsPost?.caption}
        onClose={() => setCommentsPost(null)}
        onCommentCountChange={handleCommentCountChange}
      />

      {mode === "mine" && (
        <PostComposerModal
          visible={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          onPostCreated={() => {
            setIsComposerOpen(false);
            handleRefresh();
          }}
        />
      )}
    </View>
  );
}
