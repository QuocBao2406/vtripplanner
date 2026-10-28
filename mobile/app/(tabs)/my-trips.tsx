import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
} from "react-native";
import {
  MapPinned,
  Share2,
  Calendar,
  DollarSign,
  Users,
  Sparkles,
  CheckCircle2,
  Clock,
  Navigation,
  ChevronRight,
  ListTodo,
  TrendingUp,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { api, type SavedTripItem } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";
import { useAuth } from "../../src/context/auth";
import SafeHaptics from "../../src/utils/haptics";

type StatusTab = "ALL" | "UPCOMING" | "ONGOING" | "COMPLETED";

export default function MyTripsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [trips, setTrips] = useState<SavedTripItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<StatusTab>("ALL");

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchTrips = useCallback(async () => {
    try {
      const data = await api.getMyTrips();
      setTrips(data);
    } catch (error) {
      console.warn("Failed to fetch trips:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips, user]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTrips();
  };

  const handleShareTrip = async (trip: SavedTripItem) => {
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Medium);
    const shareUrl = `https://vtripplanner.vn/trip/share/${trip.id}`;
    try {
      await Share.share({
        message: `✈️ Cùng đi du lịch ${trip.destinationName} với tôi nhé! Xem lịch trình:\n${shareUrl}`,
        url: shareUrl,
        title: trip.title,
      });
    } catch {
      showAlert("Lỗi", "Không thể chia sẻ link.");
    }
  };

  // Filter trips by status tab
  const filteredTrips = useMemo(() => {
    if (selectedTab === "ALL") return trips;
    if (selectedTab === "UPCOMING") {
      return trips.filter(
        (t) => t.status === "PLANNING" || t.status === "READY" || t.status === "DRAFT"
      );
    }
    if (selectedTab === "ONGOING") {
      return trips.filter((t) => t.status === "IN_PROGRESS");
    }
    if (selectedTab === "COMPLETED") {
      return trips.filter((t) => t.status === "COMPLETED");
    }
    return trips;
  }, [trips, selectedTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = trips.length;
    const ongoing = trips.filter((t) => t.status === "IN_PROGRESS").length;
    const completed = trips.filter((t) => t.status === "COMPLETED").length;
    return { total, ongoing, completed };
  }, [trips]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return {
          label: "ĐANG ĐI",
          bg: "bg-amber-950/70 border-amber-500/50",
          text: "text-amber-400",
        };
      case "COMPLETED":
        return {
          label: "HOÀN THÀNH",
          bg: "bg-emerald-950/70 border-emerald-500/50",
          text: "text-emerald-400",
        };
      case "READY":
        return {
          label: "SẴN SÀNG",
          bg: "bg-sky-950/70 border-sky-500/50",
          text: "text-sky-400",
        };
      case "CANCELLED":
        return {
          label: "ĐÃ HỦY",
          bg: "bg-rose-950/70 border-rose-500/50",
          text: "text-rose-400",
        };
      default:
        return {
          label: "ĐANG LÊN KẾ HOẠCH",
          bg: "bg-purple-950/70 border-purple-500/50",
          text: "text-purple-400",
        };
    }
  };

  const renderTrip = ({ item }: { item: SavedTripItem }) => {
    const statusMeta = getStatusBadge(item.status);

    // Checklist stats
    const allItems = (item.checklists || []).flatMap((c) => c.items || []);
    const completedCount = allItems.filter((i) => i.status === "COMPLETED").length;
    const totalItems = allItems.length;
    const checklistPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    // Expense stats
    const totalSpent = (item.expenseEntries || []).reduce(
      (sum, e) => sum + Number(e.actualAmount || 0),
      0
    );
    const budgetAmount = Number(
      item.managedBudget?.plannedAmount || item.totalBudget || 0
    );
    const budgetPercent =
      budgetAmount > 0 ? Math.min(Math.round((totalSpent / budgetAmount) * 100), 100) : 0;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Light);
          router.push(`/trip/${item.id}` as any);
        }}
        className="bg-slate-900 border border-slate-800 mx-3.5 my-2.5 rounded-2xl p-4 shadow-sm"
      >
        {/* Title & Status */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-white font-black text-lg">{item.title}</Text>
            <View className="flex-row items-center mt-1">
              <Navigation size={12} color="#10B981" />
              <Text className="text-emerald-400 font-bold text-xs ml-1">
                {item.originName} ➔ {item.destinationName}
              </Text>
            </View>
          </View>
          <View className={`border px-2.5 py-1 rounded-full ${statusMeta.bg}`}>
            <Text className={`font-black text-[10px] ${statusMeta.text}`}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        {/* Info Badges */}
        <View className="flex-row items-center justify-between my-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
          <View className="flex-row items-center">
            <Calendar size={13} color="#94A3B8" />
            <Text className="text-slate-300 text-xs font-semibold ml-1.5">
              {new Date(item.startDate).toLocaleDateString("vi-VN")}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Users size={13} color="#94A3B8" />
            <Text className="text-slate-300 text-xs font-semibold ml-1.5">
              {item.travelerCount} người
            </Text>
          </View>
          <View className="flex-row items-center">
            <DollarSign size={13} color="#10B981" />
            <Text className="text-emerald-400 text-xs font-black ml-0.5">
              {budgetAmount > 0
                ? `${budgetAmount.toLocaleString("vi-VN")}đ`
                : "Chưa đặt ngân sách"}
            </Text>
          </View>
        </View>

        {/* Checklist Progress Bar */}
        {totalItems > 0 && (
          <View className="mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center">
                <ListTodo size={13} color="#60A5FA" />
                <Text className="text-slate-300 text-xs font-bold ml-1.5">
                  Đồ đạc & Chuẩn bị
                </Text>
              </View>
              <Text className="text-sky-400 font-extrabold text-xs">
                {completedCount}/{totalItems} ({checklistPercent}%)
              </Text>
            </View>
            <View className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${checklistPercent}%` }}
              />
            </View>
          </View>
        )}

        {/* Expenses Snippet */}
        {(totalSpent > 0 || budgetAmount > 0) && (
          <View className="mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center">
                <TrendingUp size={13} color="#34D399" />
                <Text className="text-slate-300 text-xs font-bold ml-1.5">
                  Theo dõi chi phí
                </Text>
              </View>
              <Text className="text-emerald-400 font-extrabold text-xs">
                Đã chi: {totalSpent.toLocaleString("vi-VN")}đ
                {budgetAmount > 0 ? ` / ${budgetAmount.toLocaleString("vi-VN")}đ` : ""}
              </Text>
            </View>
            {budgetAmount > 0 && (
              <View className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    totalSpent > budgetAmount ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </View>
            )}
          </View>
        )}

        {/* Days & Activities count */}
        {item.days && item.days.length > 0 && (
          <View className="mt-2 pt-2 border-t border-slate-800/60 flex-row items-center justify-between">
            <Text className="text-slate-400 text-xs font-medium">
              {item.days.length} ngày ·{" "}
              {item.days.reduce((acc, d) => acc + d.activities.length, 0)} điểm tham quan
            </Text>
            <View className="flex-row items-center">
              <Text className="text-emerald-400 font-bold text-xs mr-0.5">Chi tiết</Text>
              <ChevronRight size={14} color="#10B981" />
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row items-center space-x-2 mt-3 pt-1">
          <TouchableOpacity
            onPress={() => handleShareTrip(item)}
            className="flex-1 bg-slate-800 border border-slate-700 py-2.5 rounded-xl flex-row items-center justify-center"
          >
            <Share2 size={14} color="#E2E8F0" />
            <Text className="text-slate-200 font-bold text-xs ml-1.5">Chia sẻ link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Medium);
              router.push(`/trip/${item.id}` as any);
            }}
            className="flex-1 bg-emerald-500 py-2.5 rounded-xl flex-row items-center justify-center shadow-md ml-2"
          >
            <Sparkles size={14} color="#020617" />
            <Text className="text-slate-950 font-black text-xs ml-1.5">Quản lý chuyến</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Screen Header */}
      <View className="p-4 bg-slate-950 border-b border-slate-800">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <MapPinned size={18} color={COLORS.primary} />
            <Text className="text-emerald-400 font-extrabold text-xs uppercase tracking-widest ml-1.5">
              HÀNH TRÌNH CỦA BẠN
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/planner")}
            className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex-row items-center"
          >
            <Sparkles size={12} color="#10B981" />
            <Text className="text-emerald-400 font-bold text-xs ml-1">+ Tạo mới</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-white font-black text-2xl">Quản Lý Chuyến Đi</Text>

        {/* Quick Stats */}
        <View className="flex-row items-center justify-between mt-3 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
          <View className="items-center flex-1">
            <Text className="text-white font-black text-base">{stats.total}</Text>
            <Text className="text-slate-400 text-[11px]">Tổng chuyến</Text>
          </View>
          <View className="h-6 w-px bg-slate-800" />
          <View className="items-center flex-1">
            <Text className="text-amber-400 font-black text-base">{stats.ongoing}</Text>
            <Text className="text-slate-400 text-[11px]">Đang đi</Text>
          </View>
          <View className="h-6 w-px bg-slate-800" />
          <View className="items-center flex-1">
            <Text className="text-emerald-400 font-black text-base">{stats.completed}</Text>
            <Text className="text-slate-400 text-[11px]">Đã hoàn thành</Text>
          </View>
        </View>

        {/* Status Filter Tabs */}
        <View className="flex-row items-center space-x-2 mt-3">
          {(
            [
              { key: "ALL", label: "Tất cả" },
              { key: "UPCOMING", label: "Sắp tới" },
              { key: "ONGOING", label: "Đang đi" },
              { key: "COMPLETED", label: "Đã hoàn thành" },
            ] as Array<{ key: StatusTab; label: string }>
          ).map((tab) => {
            const isActive = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  SafeHaptics.selectionAsync();
                  setSelectedTab(tab.key);
                }}
                className={`flex-1 py-1.5 rounded-lg items-center border mr-1 ${
                  isActive
                    ? "bg-emerald-500 border-emerald-400"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? "text-slate-950 font-black" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-slate-400 text-xs mt-3">Đang tải danh sách chuyến đi...</Text>
        </View>
      ) : filteredTrips.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-slate-300 font-bold text-base text-center mb-1">
            {selectedTab === "ALL"
              ? "Bạn chưa có chuyến đi nào được lưu"
              : `Không có chuyến đi nào ở mục "${
                  selectedTab === "UPCOMING"
                    ? "Sắp tới"
                    : selectedTab === "ONGOING"
                    ? "Đang đi"
                    : "Đã hoàn thành"
                }"`}
          </Text>
          <Text className="text-slate-500 text-xs text-center mb-4">
            Bắt đầu tạo lịch trình với AI thông minh chỉ trong 30 giây!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/planner")}
            className="bg-emerald-500 px-5 py-3 rounded-xl flex-row items-center shadow-lg"
          >
            <Sparkles size={16} color="#020617" />
            <Text className="text-slate-950 font-black text-xs ml-1.5">
              TẠO CHUYẾN ĐI MỚI NGAY
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

