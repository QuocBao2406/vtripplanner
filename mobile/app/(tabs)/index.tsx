import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  AppState,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Bookmark,
  Sparkles,
  ShieldCheck,
  User,
  Compass,
  FileText,
  ArrowUp,
  RefreshCw,
} from "lucide-react-native";
import Haptics from "../../src/utils/haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
  api,
  type SocialFeedItem,
} from "../../src/services/api";
import { BrandLogo } from "../../src/components/BrandLogo";
import { CommentsModal } from "../../src/components/CommentsModal";
import { PostComposerModal } from "../../src/components/PostComposerModal";
import { PostCard, isEditorialPost } from "../../src/components/social/PostCard";
import { emitPostPatch, useSyncedPosts } from "../../src/lib/postEvents";
import { useAuth } from "../../src/context/auth";
import { COLORS, resolveMediaUrl } from "../../src/constants/theme";

const NEW_POST_POLL_INTERVAL_MS = 60_000;

export default function SocialFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  // Social Feed State
  const [posts, setPosts] = useState<SocialFeedItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filter between All / Admin (Giới thiệu du lịch) / User (Chia sẻ trải nghiệm)
  const [feedFilter, setFeedFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");

  // Modals state
  const [selectedPostForComments, setSelectedPostForComments] = useState<SocialFeedItem | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Đồng bộ với web: cùng tháng xếp hạng và cùng cơ chế báo bài mới.
  const feedMonthRef = useRef<number | null>(null);
  const snapshotAtRef = useRef<string | null>(null);
  const isCheckingUpdatesRef = useRef(false);
  const listRef = useRef<FlatList<SocialFeedItem>>(null);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Fetch Social Feed
  const fetchFeed = useCallback(async (cursor?: string, refresh = false) => {
    try {
      const data = await api.getFeed(cursor, feedMonthRef.current ?? undefined);
      if (refresh) {
        setPosts(data.posts);
        feedMonthRef.current = data.currentMonth;
        snapshotAtRef.current = data.snapshotAt;
        setHasNewPosts(false);
      } else {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
        });
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setFeedError(null);
    } catch (error) {
      console.warn("Failed to load live feed:", error);
      if (refresh) {
        setFeedError("Không kết nối được máy chủ. Kéo xuống hoặc bấm Thử lại để tải lại bảng tin.");
      }
    } finally {
      setIsFeedLoading(false);
      setIsFeedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(undefined, true);
  }, []);

  const reloadFeed = useCallback(() => {
    setIsFeedRefreshing(true);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    fetchFeed(undefined, true);
  }, [fetchFeed]);

  const checkForNewPosts = useCallback(async () => {
    const month = feedMonthRef.current;
    const snapshotAt = snapshotAtRef.current;
    if (!month || !snapshotAt || isCheckingUpdatesRef.current) return;
    isCheckingUpdatesRef.current = true;
    try {
      if (await api.checkFeedUpdates(month, snapshotAt)) setHasNewPosts(true);
    } catch {
      // Lỗi mạng tạm thời: bỏ qua, lần dò sau thử lại.
    } finally {
      isCheckingUpdatesRef.current = false;
    }
  }, []);

  // Dò bài mới mỗi 60 giây khi tab đang mở, và ngay khi quay lại tab/app (giống web).
  useFocusEffect(
    useCallback(() => {
      checkForNewPosts();
      const interval = setInterval(checkForNewPosts, NEW_POST_POLL_INTERVAL_MS);
      const appStateSub = AppState.addEventListener("change", (state) => {
        if (state === "active") checkForNewPosts();
      });
      return () => {
        clearInterval(interval);
        appStateSub.remove();
      };
    }, [checkForNewPosts]),
  );

  const handleOpenComposer = () => {
    Haptics.selectionAsync();
    if (!user) {
      if (Platform.OS === "web") {
        const conf = window.confirm("Bạn cần đăng nhập để đăng bài viết. Chuyển đến trang Đăng nhập?");
        if (conf) router.push("/(auth)/login");
      } else {
        router.push("/(auth)/login");
      }
      return;
    }
    setIsComposerOpen(true);
  };

  useSyncedPosts(setPosts);

  const openAccountScreen = async (path: "/social/my-posts" | "/social/saved") => {
    Haptics.selectionAsync();
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    router.push(path as any);
  };

  const handleCommentCountUpdate = (postId: string, newCount: number) => {
    emitPostPatch(postId, { commentCount: newCount });
  };

  // Filtered posts based on Admin (Giới thiệu du lịch) vs User (Trải nghiệm)
  const filteredPosts = useMemo(() => {
    if (feedFilter === "ALL") return posts;
    if (feedFilter === "ADMIN") return posts.filter((p) => isEditorialPost(p));
    return posts.filter((p) => !isEditorialPost(p));
  }, [posts, feedFilter]);

  const topPadding = insets.top > 0 ? insets.top + 8 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 16);

  const displayName =
    profile?.displayName ||
    profile?.fullName ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Bạn";

  const userAvatarUrl = resolveMediaUrl(profile?.avatarUrl || user?.user_metadata?.avatar_url);

  // Common Header
  const renderHeader = () => (
    <View className="bg-slate-950">
      {/* App Top Bar */}
      <View style={{ paddingTop: topPadding }} className="px-4 pb-3 bg-slate-950 border-b border-slate-800">
        <View className="flex-row items-center justify-between">
          <BrandLogo size="md" />
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => openAccountScreen("/social/my-posts")}
              accessibilityLabel="Bài viết của tôi"
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 items-center justify-center mr-2"
            >
              <FileText size={17} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openAccountScreen("/social/saved")}
              accessibilityLabel="Bài viết đã lưu"
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 items-center justify-center mr-2"
            >
              <Bookmark size={17} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/planner")}
              accessibilityLabel="Lập chuyến đi với AI"
              className="w-9 h-9 rounded-xl bg-emerald-500 items-center justify-center shadow-md shadow-emerald-500/25"
            >
              <Sparkles size={17} color="#020617" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Share / Post Launcher Box */}
      <View className="bg-slate-900 mx-3 mt-3 mb-2 rounded-3xl border border-slate-800 p-3.5 shadow-sm">
        <View className="flex-row items-center">
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#064E3B",
              borderWidth: 1.5,
              borderColor: "#10B981",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {userAvatarUrl ? (
              <Image source={{ uri: userAvatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <Text className="text-emerald-400 font-black text-sm">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleOpenComposer}
            activeOpacity={0.8}
            className="flex-1 ml-3 bg-slate-950 border border-slate-800 py-2.5 px-4 rounded-2xl"
          >
            <Text className="text-slate-400 text-xs font-medium">
              Bạn có trải nghiệm hay địa điểm mới? Đăng bài ngay...
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80">
          <TouchableOpacity
            onPress={handleOpenComposer}
            className="flex-row items-center py-1.5 px-3 rounded-xl active:bg-slate-800 bg-sky-950/40 border border-sky-500/20"
          >
            <User size={15} color="#38BDF8" />
            <Text className="text-sky-300 text-xs font-bold ml-1.5">Chia sẻ chuyến đi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenComposer}
            className="flex-row items-center py-1.5 px-3 rounded-xl active:bg-slate-800 bg-amber-950/40 border border-amber-500/20"
          >
            <ShieldCheck size={15} color="#F59E0B" />
            <Text className="text-amber-400 text-xs font-bold ml-1.5">Giới thiệu du lịch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/planner")}
            className="flex-row items-center py-1.5 px-2.5 rounded-xl active:bg-slate-800"
          >
            <Sparkles size={15} color="#10B981" />
            <Text className="text-emerald-400 text-xs font-bold ml-1">Lịch trình AI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Mode Filters: Tất cả | Ban biên tập (Admin) | Du khách chia sẻ */}
      <View className="flex-row mx-3 mt-1 mb-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setFeedFilter("ALL");
          }}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            feedFilter === "ALL" ? "bg-slate-800 border border-slate-700 shadow-sm" : ""
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              feedFilter === "ALL" ? "text-emerald-400 font-black" : "text-slate-400"
            }`}
          >
            🌐 Tất cả ({posts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setFeedFilter("ADMIN");
          }}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            feedFilter === "ADMIN" ? "bg-amber-500/20 border border-amber-500/40 shadow-sm" : ""
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              feedFilter === "ADMIN" ? "text-amber-400 font-black" : "text-slate-400"
            }`}
          >
            🌟 Ban biên tập
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setFeedFilter("USER");
          }}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            feedFilter === "USER" ? "bg-sky-500/20 border border-sky-500/40 shadow-sm" : ""
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              feedFilter === "USER" ? "text-sky-300 font-black" : "text-slate-400"
            }`}
          >
            🎒 Du khách chia sẻ
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFeedPost = ({ item, index }: { item: SocialFeedItem; index: number }) => (
    <PostCard
      post={item}
      index={index}
      onOpenComments={setSelectedPostForComments}
    />
  );

  return (
    <View className="flex-1 bg-slate-950">
      {renderHeader()}

      {isFeedLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-slate-400 text-xs mt-3 font-semibold">
            Đang tải bảng tin du lịch cộng đồng...
          </Text>
        </View>
      ) : feedError && posts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <RefreshCw size={40} color="#334155" />
          <Text className="text-white font-bold text-base mt-3 text-center">
            Không tải được bảng tin
          </Text>
          <Text className="text-slate-400 text-xs mt-1 text-center">{feedError}</Text>
          <TouchableOpacity onPress={reloadFeed} className="mt-4 bg-emerald-500 px-4 py-2 rounded-xl">
            <Text className="text-slate-950 font-black text-xs">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPosts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Compass size={44} color="#334155" />
          <Text className="text-white font-bold text-base mt-3 text-center">
            Chưa có bài viết trong mục này
          </Text>
          <Text className="text-slate-400 text-xs mt-1 text-center">
            Hãy là người đầu tiên đăng bài hoặc chuyển sang mục Tất cả để xem thêm!
          </Text>
          <TouchableOpacity
            onPress={() => setFeedFilter("ALL")}
            className="mt-4 bg-emerald-500 px-4 py-2 rounded-xl"
          >
            <Text className="text-slate-950 font-black text-xs">Xem tất cả bài viết</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedPost}
          contentContainerStyle={{ paddingBottom: 36 }}
          refreshControl={
            <RefreshControl
              refreshing={isFeedRefreshing}
              onRefresh={reloadFeed}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={() => {
            if (hasMore && nextCursor) fetchFeed(nextCursor);
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Báo có bài mới, giống nút "bài viết mới" trên web */}
      {hasNewPosts && !isFeedLoading && (
        <View pointerEvents="box-none" style={{ position: "absolute", top: topPadding + 56, left: 0, right: 0, alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              reloadFeed();
            }}
            accessibilityLabel="Có bài viết mới, bấm để tải lại"
            className="bg-emerald-500 px-4 py-2 rounded-full flex-row items-center shadow-lg shadow-emerald-500/30"
          >
            <ArrowUp size={14} color="#020617" />
            <Text className="text-slate-950 font-black text-xs ml-1.5">Có bài viết mới</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Post Composer Modal */}
      <PostComposerModal
        visible={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onPostCreated={reloadFeed}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={Boolean(selectedPostForComments)}
        postId={selectedPostForComments?.id || null}
        postTitle={selectedPostForComments?.headline || selectedPostForComments?.caption}
        onClose={() => setSelectedPostForComments(null)}
        onCommentCountChange={handleCommentCountUpdate}
      />
    </View>
  );
}
