import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Share,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  Share2,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Navigation,
  Sun,
  CloudRain,
  Snowflake,
  Bike,
  TrendingUp,
  Wallet,
  Send,
  Edit3,
  Check,
  Tag,
  FileText,
  X,
} from "lucide-react-native";
import {
  api,
  type TripDetail,
  type TripExpenseCategoryType,
  type TripChecklistDetail,
  type TripChecklistItem,
} from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";
import SafeHaptics from "../../src/utils/haptics";

type TabType = "ITINERARY" | "CHECKLIST" | "EXPENSES" | "SHARE";

const EXPENSE_CATEGORIES: Array<{
  key: TripExpenseCategoryType;
  label: string;
  color: string;
}> = [
  { key: "TRANSPORTATION", label: "Đi lại", color: "#38BDF8" },
  { key: "ACCOMMODATION", label: "Phòng nghỉ", color: "#818CF8" },
  { key: "FOOD", label: "Ăn uống", color: "#F59E0B" },
  { key: "TICKET", label: "Vé tham quan", color: "#EC4899" },
  { key: "ACTIVITY", label: "Hoạt động", color: "#10B981" },
  { key: "SHOPPING", label: "Mua sắm", color: "#A855F7" },
  { key: "OTHER", label: "Khác", color: "#94A3B8" },
];

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("ITINERARY");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Modals state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // Form states
  const [renamedTitle, setRenamedTitle] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newExpenseTitle, setNewExpenseTitle] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState<TripExpenseCategoryType>("FOOD");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseNote, setNewExpenseNote] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");

  // Share state
  const [shareHeadline, setShareHeadline] = useState("");
  const [shareCaption, setShareCaption] = useState("");
  const [isSharingToFeed, setIsSharingToFeed] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchTrip = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getTripDetail(id);
      if (data) {
        setTrip(data);
        setRenamedTitle(data.title);
        setShareHeadline(`Kinh nghiệm du lịch ${data.destinationName}: ${data.title}`);
        setShareCaption(
          `Lịch trình ${data.days?.length || 1} ngày cực chi tiết khởi hành từ ${data.originName}. Tổng chi phí và các điểm check-in hấp dẫn!`
        );
        const budget = data.managedBudget?.plannedAmount || data.totalBudget;
        if (budget) setNewBudgetAmount(String(budget));
      }
    } catch (error) {
      console.warn("Failed to load trip:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  // --- Handlers ---
  const handleUpdateStatus = async (newStatus: string) => {
    if (!trip) return;
    SafeHaptics.selectionAsync();
    try {
      await api.updateTripStatus(trip.id, newStatus);
      setTrip((prev) => (prev ? { ...prev, status: newStatus } : null));
      setShowStatusModal(false);
      SafeHaptics.notificationAsync(SafeHaptics.NotificationFeedbackType.Success);
    } catch {
      showAlert("Lỗi", "Không thể cập nhật trạng thái.");
    }
  };

  const handleRenameTrip = async () => {
    if (!trip || !renamedTitle.trim()) return;
    try {
      await api.updateTripTitle(trip.id, renamedTitle.trim());
      setTrip((prev) => (prev ? { ...prev, title: renamedTitle.trim() } : null));
      setShowRenameModal(false);
      SafeHaptics.notificationAsync(SafeHaptics.NotificationFeedbackType.Success);
    } catch {
      showAlert("Lỗi", "Không thể đổi tên chuyến đi.");
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;
    const executeDelete = async () => {
      try {
        await api.deleteTrip(trip.id);
        SafeHaptics.notificationAsync(SafeHaptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)/my-trips");
      } catch {
        showAlert("Lỗi", "Không thể xóa chuyến đi.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Bạn có chắc chắn muốn xóa chuyến đi này không?")) {
        executeDelete();
      }
    } else {
      Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa chuyến đi này không?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: executeDelete },
      ]);
    }
  };

  // --- Checklist Handlers ---
  const handleApplyPreset = async (presetKey: string) => {
    if (!trip) return;
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.applySeasonalChecklist(trip.id, presetKey);
      if (res.ok) {
        await fetchTrip();
        SafeHaptics.notificationAsync(SafeHaptics.NotificationFeedbackType.Success);
        showAlert("Thành công", `Đã thêm bộ checklist: ${res.checklist.title}!`);
      }
    } catch (err: any) {
      showAlert("Lỗi", err.message || "Không thể áp dụng preset.");
    }
  };

  const handleToggleChecklist = async (item: TripChecklistItem) => {
    SafeHaptics.selectionAsync();
    try {
      // Optimistic update
      const targetStatus = item.status === "COMPLETED" ? "TODO" : "COMPLETED";
      setTrip((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          checklists: prev.checklists.map((c) => ({
            ...c,
            items: c.items.map((i) =>
              i.id === item.id ? { ...i, status: targetStatus } : i
            ),
          })),
        };
      });

      await api.toggleChecklistItem(item.id);
    } catch {
      fetchTrip();
    }
  };

  const handleAddChecklistItem = async () => {
    if (!trip || !newChecklistText.trim()) return;
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Light);
    try {
      await api.addChecklistItem(trip.id, newChecklistText.trim());
      setNewChecklistText("");
      await fetchTrip();
    } catch {
      showAlert("Lỗi", "Không thể thêm đồ dùng.");
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Light);
    try {
      await api.deleteChecklistItem(itemId);
      setTrip((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          checklists: prev.checklists.map((c) => ({
            ...c,
            items: c.items.filter((i) => i.id !== itemId),
          })),
        };
      });
    } catch {
      showAlert("Lỗi", "Không thể xóa mục checklist.");
    }
  };

  // --- Expense Handlers ---
  const handleSaveBudget = async () => {
    if (!trip) return;
    const amount = Number(newBudgetAmount);
    if (isNaN(amount) || amount < 0) {
      showAlert("Lỗi", "Vui lòng nhập số tiền hợp lệ.");
      return;
    }
    try {
      await api.addTripExpense({
        tripId: trip.id,
        title: "",
        category: "OTHER",
        actualAmount: 0,
        plannedBudget: amount,
      });
      setShowBudgetModal(false);
      await fetchTrip();
      SafeHaptics.notificationAsync(SafeHaptics.NotificationFeedbackType.Success);
    } catch {
      showAlert("Lỗi", "Không thể cập nhật ngân sách.");
    }
  };

  const handleAddExpense = async () => {
    if (!trip || !newExpenseTitle.trim() || !newExpenseAmount.trim()) {
      showAlert("Lỗi", "Vui lòng nhập tên khoản chi và số tiền.");
      return;
    }
    const amount = Number(newExpenseAmount.replace(/[^0-9]/g, ""));
    if (isNaN(amount) || amount <= 0) {
      showAlert("Lỗi", "Số tiền chi tiêu phải lớn hơn 0.");
      return;
    }

    try {
      await api.addTripExpense({
        tripId: trip.id,
        title: newExpenseTitle.trim(),
        category: newExpenseCategory,
        actualAmount: amount,
        note: newExpenseNote.trim() || undefined,
      });
      setNewExpenseTitle("");
      setNewExpenseAmount("");
      setNewExpenseNote("");
      setShowExpenseModal(false);
      await fetchTrip();
      SafeHaptics.notificationAsync(SafeHaptics.NotificationFeedbackType.Success);
    } catch {
      showAlert("Lỗi", "Không thể thêm khoản chi.");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Light);
    try {
      await api.deleteTripExpense(expenseId);
      setTrip((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          expenseEntries: prev.expenseEntries.filter((e) => e.id !== expenseId),
        };
      });
    } catch {
      showAlert("Lỗi", "Không thể xóa khoản chi.");
    }
  };

  // --- Share Handlers ---
  const handleShareLink = async () => {
    if (!trip) return;
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Medium);
    const shareUrl = `https://vtripplanner.vn/trip/share/${trip.id}`;
    try {
      await Share.share({
        message: `✈️ Khám phá lịch trình du lịch ${trip.destinationName} của tôi tại: ${shareUrl}`,
        url: shareUrl,
        title: trip.title,
      });
    } catch {
      showAlert("Lỗi", "Không thể mở hộp thoại chia sẻ.");
    }
  };

  const handleShareToCommunity = async () => {
    if (!trip) return;
    setIsSharingToFeed(true);
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Heavy);
    try {
      const res = await api.shareTripToFeed(
        trip.id,
        shareHeadline.trim() || undefined,
        shareCaption.trim() || undefined
      );
      SafeHaptics.notificationAsync(SafeHaptics.NotificationFeedbackType.Success);
      showAlert(
        "Thành công 🎉",
        "Chuyến đi của bạn đã được đăng lên Bảng tin cộng đồng! Bạn có thể xem lại tại tab Khám phá."
      );
    } catch (err: any) {
      showAlert("Lỗi", err.message || "Không thể chia sẻ lên cộng đồng.");
    } finally {
      setIsSharingToFeed(false);
    }
  };

  // Calculations
  const totalSpent = useMemo(() => {
    return (trip?.expenseEntries || []).reduce(
      (sum, e) => sum + Number(e.actualAmount || 0),
      0
    );
  }, [trip?.expenseEntries]);

  const plannedBudget = useMemo(() => {
    return Number(trip?.managedBudget?.plannedAmount || trip?.totalBudget || 0);
  }, [trip?.managedBudget, trip?.totalBudget]);

  const remainingBudget = plannedBudget - totalSpent;

  const allChecklistItems = useMemo(() => {
    return (trip?.checklists || []).flatMap((c) => c.items);
  }, [trip?.checklists]);

  const completedChecklistCount = useMemo(() => {
    return allChecklistItems.filter((i) => i.status === "COMPLETED").length;
  }, [allChecklistItems]);

  const checklistProgressPercent = useMemo(() => {
    if (allChecklistItems.length === 0) return 0;
    return Math.round((completedChecklistCount / allChecklistItems.length) * 100);
  }, [completedChecklistCount, allChecklistItems.length]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-slate-400 text-xs mt-3">Đang tải chi tiết chuyến đi...</Text>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <Text className="text-white font-bold text-lg mb-2">Không tìm thấy chuyến đi</Text>
        <Text className="text-slate-400 text-xs text-center mb-4">
          Chuyến đi không tồn tại hoặc bạn không có quyền xem.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-emerald-500 px-4 py-2.5 rounded-xl"
        >
          <Text className="text-slate-950 font-black text-xs">Quay lại danh sách</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "IN_PROGRESS":
        return "ĐANG ĐI";
      case "COMPLETED":
        return "HOÀN THÀNH";
      case "READY":
        return "SẴN SÀNG";
      case "CANCELLED":
        return "ĐÃ HỦY";
      default:
        return "LÊN KẾ HOẠCH";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Top App Bar */}
      <View className="bg-slate-950 border-b border-slate-800 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              onPress={() => setShowRenameModal(true)}
              className="p-2 rounded-full bg-slate-900 border border-slate-800 mr-2"
            >
              <Edit3 size={15} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowStatusModal(true)}
              className="px-3 py-1 rounded-full border bg-emerald-950/80 border-emerald-500/50 flex-row items-center mr-2"
            >
              <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
              <Text className="text-emerald-400 font-extrabold text-[11px]">
                {getStatusLabel(trip.status)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteTrip}
              className="p-2 rounded-full bg-rose-950/60 border border-rose-900/60"
            >
              <Trash2 size={15} color="#F43F5E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trip Title & Route */}
        <View className="mt-3">
          <Text className="text-white font-black text-xl leading-tight">
            {trip.title}
          </Text>
          <View className="flex-row items-center mt-1">
            <Navigation size={13} color="#10B981" />
            <Text className="text-emerald-400 font-bold text-xs ml-1.5">
              {trip.originName} ➔ {trip.destinationName}
            </Text>
            <Text className="text-slate-500 text-xs mx-2">·</Text>
            <Text className="text-slate-400 text-xs">
              {trip.days?.length || 1} ngày ({trip.travelerCount} người)
            </Text>
          </View>
        </View>

        {/* 4-Tab Segmented Control */}
        <View className="flex-row items-center mt-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(
            [
              { key: "ITINERARY", label: "Lịch trình" },
              { key: "CHECKLIST", label: `Checklist (${allChecklistItems.length})` },
              { key: "EXPENSES", label: "Chi phí" },
              { key: "SHARE", label: "Chia sẻ" },
            ] as Array<{ key: TabType; label: string }>
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  SafeHaptics.selectionAsync();
                  setActiveTab(tab.key);
                }}
                className={`flex-1 py-2 rounded-lg items-center ${
                  isActive ? "bg-emerald-500" : ""
                }`}
              >
                <Text
                  className={`text-xs font-black ${
                    isActive ? "text-slate-950" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* TAB 1: ITINERARY */}
        {activeTab === "ITINERARY" && (
          <View>
            {/* Day selector pills */}
            {trip.days && trip.days.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                {trip.days.map((day, idx) => {
                  const isSelected = selectedDayIndex === idx;
                  return (
                    <TouchableOpacity
                      key={day.id}
                      onPress={() => {
                        SafeHaptics.selectionAsync();
                        setSelectedDayIndex(idx);
                      }}
                      className={`px-4 py-2 rounded-xl mr-2 border ${
                        isSelected
                          ? "bg-emerald-500/20 border-emerald-400"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-xs font-black ${
                          isSelected ? "text-emerald-400" : "text-slate-400"
                        }`}
                      >
                        Ngày {day.dayNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Current day activities */}
            {trip.days && trip.days[selectedDayIndex] ? (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-black text-base">
                    Lịch trình Ngày {trip.days[selectedDayIndex].dayNumber}
                  </Text>
                  <Text className="text-slate-400 text-xs">
                    {trip.days[selectedDayIndex].activities.length} hoạt động
                  </Text>
                </View>

                {trip.days[selectedDayIndex].activities.length === 0 ? (
                  <View className="bg-slate-900 border border-slate-800 p-6 rounded-2xl items-center">
                    <Text className="text-slate-400 text-xs text-center">
                      Chưa có hoạt động nào trong ngày này.
                    </Text>
                  </View>
                ) : (
                  trip.days[selectedDayIndex].activities.map((act, actIdx) => (
                    <View
                      key={act.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-2">
                          <View className="flex-row items-center mb-1">
                            <Clock size={12} color="#10B981" />
                            <Text className="text-emerald-400 font-extrabold text-xs ml-1">
                              {act.startsAt
                                ? new Date(act.startsAt).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "08:00"}
                              {act.endsAt
                                ? ` - ${new Date(act.endsAt).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`
                                : ""}
                            </Text>
                            <View className="bg-slate-800 px-2 py-0.5 rounded ml-2">
                              <Text className="text-slate-300 text-[10px] font-bold uppercase">
                                {act.type}
                              </Text>
                            </View>
                          </View>

                          <Text className="text-white font-black text-base">
                            {act.title}
                          </Text>

                          {act.place && (
                            <View className="flex-row items-center mt-1">
                              <MapPin size={12} color="#94A3B8" />
                              <Text className="text-slate-400 text-xs ml-1">
                                {act.place.name}
                                {act.place.addressLine ? ` · ${act.place.addressLine}` : ""}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View className="bg-slate-900 border border-slate-800 p-6 rounded-2xl items-center">
                <Text className="text-slate-400 text-xs">Không có dữ liệu ngày.</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: CHECKLIST */}
        {activeTab === "CHECKLIST" && (
          <View>
            {/* Seasonal Presets Selector */}
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center mb-1">
                <Sparkles size={16} color={COLORS.primary} />
                <Text className="text-white font-black text-sm ml-1.5">
                  Bộ Checklist Theo Mùa & Phong Cách
                </Text>
              </View>
              <Text className="text-slate-400 text-xs mb-3">
                Thêm ngay đồ đạc chuyên dụng theo thời tiết điểm đến chỉ với 1 chạm:
              </Text>

              <View className="flex-row flex-wrap justify-between">
                <TouchableOpacity
                  onPress={() => handleApplyPreset("MUA_MUA")}
                  className="w-[48%] bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex-row items-center mb-2"
                >
                  <CloudRain size={16} color="#38BDF8" />
                  <Text className="text-slate-200 text-xs font-bold ml-2">Mùa mưa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleApplyPreset("MUA_LANH")}
                  className="w-[48%] bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex-row items-center mb-2"
                >
                  <Snowflake size={16} color="#818CF8" />
                  <Text className="text-slate-200 text-xs font-bold ml-2">Mùa lạnh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleApplyPreset("BIEN_HE")}
                  className="w-[48%] bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex-row items-center"
                >
                  <Sun size={16} color="#F59E0B" />
                  <Text className="text-slate-200 text-xs font-bold ml-2">Biển hè</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleApplyPreset("PHUOT_XE_MAY")}
                  className="w-[48%] bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex-row items-center"
                >
                  <Bike size={16} color="#10B981" />
                  <Text className="text-slate-200 text-xs font-bold ml-2">Phượt xe máy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Progress Card */}
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-black text-sm">Tiến Độ Chuẩn Bị</Text>
                <Text className="text-emerald-400 font-black text-sm">
                  {completedChecklistCount}/{allChecklistItems.length} món ({checklistProgressPercent}%)
                </Text>
              </View>
              <View className="h-2 bg-slate-950 rounded-full overflow-hidden">
                <View
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${checklistProgressPercent}%` }}
                />
              </View>
            </View>

            {/* Add Custom Item Input */}
            <View className="flex-row items-center mb-4 space-x-2">
              <TextInput
                value={newChecklistText}
                onChangeText={setNewChecklistText}
                placeholder="Thêm đồ dùng cần mang (ví dụ: Sạc dự phòng...)"
                placeholderTextColor="#64748B"
                className="flex-1 bg-slate-900 border border-slate-800 text-white px-3.5 py-3 rounded-xl text-xs mr-2"
              />
              <TouchableOpacity
                onPress={handleAddChecklistItem}
                className="bg-emerald-500 p-3 rounded-xl items-center justify-center"
              >
                <Plus size={18} color="#020617" />
              </TouchableOpacity>
            </View>

            {/* Checklist items by group */}
            {trip.checklists.length === 0 || allChecklistItems.length === 0 ? (
              <View className="bg-slate-900 border border-slate-800 p-6 rounded-2xl items-center">
                <Text className="text-slate-400 text-xs text-center mb-2">
                  Chưa có món đồ nào trong danh sách.
                </Text>
                <Text className="text-emerald-400 text-xs font-bold text-center">
                  Nhấn vào một bộ checklist phía trên để bắt đầu!
                </Text>
              </View>
            ) : (
              trip.checklists.map((cl) => (
                <View key={cl.id} className="mb-4">
                  <Text className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-2">
                    {cl.title}
                  </Text>
                  {cl.items.map((item) => {
                    const isDone = item.status === "COMPLETED";
                    return (
                      <View
                        key={item.id}
                        className={`flex-row items-center justify-between p-3.5 rounded-xl border mb-2 ${
                          isDone
                            ? "bg-slate-950/60 border-slate-800/60 opacity-60"
                            : "bg-slate-900 border-slate-800"
                        }`}
                      >
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleToggleChecklist(item)}
                          className="flex-1 flex-row items-center mr-2"
                        >
                          {isDone ? (
                            <CheckCircle2 size={20} color="#10B981" />
                          ) : (
                            <Circle size={20} color="#64748B" />
                          )}
                          <View className="ml-3 flex-1">
                            <Text
                              className={`text-xs font-bold ${
                                isDone ? "text-slate-500 line-through" : "text-white"
                              }`}
                            >
                              {item.title}
                            </Text>
                            {item.note && (
                              <Text className="text-[11px] text-slate-400 mt-0.5">
                                {item.note}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteChecklistItem(item.id)}
                          className="p-1"
                        >
                          <Trash2 size={15} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: EXPENSES */}
        {activeTab === "EXPENSES" && (
          <View>
            {/* Budget Summary Card */}
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Wallet size={16} color={COLORS.primary} />
                  <Text className="text-white font-black text-sm ml-1.5">
                    Quản Lý Ngân Sách
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowBudgetModal(true)}
                  className="bg-slate-800 px-2.5 py-1 rounded-lg"
                >
                  <Text className="text-emerald-400 text-xs font-bold">Đặt ngân sách</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between my-2">
                <View>
                  <Text className="text-slate-400 text-[11px]">Đã chi thực tế</Text>
                  <Text className="text-white font-black text-lg">
                    {totalSpent.toLocaleString("vi-VN")}đ
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-slate-400 text-[11px]">Ngân sách dự kiến</Text>
                  <Text className="text-slate-300 font-bold text-sm">
                    {plannedBudget > 0 ? `${plannedBudget.toLocaleString("vi-VN")}đ` : "---"}
                  </Text>
                </View>
              </View>

              {plannedBudget > 0 && (
                <View className="mt-2">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-slate-400 text-[11px]">
                      {remainingBudget >= 0 ? "Còn lại" : "Vượt ngân sách"}
                    </Text>
                    <Text
                      className={`text-xs font-extrabold ${
                        remainingBudget >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {Math.abs(remainingBudget).toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                  <View className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <View
                      className={`h-full rounded-full ${
                        totalSpent > plannedBudget ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(Math.round((totalSpent / plannedBudget) * 100), 100)}%`,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Add Expense Button */}
            <TouchableOpacity
              onPress={() => setShowExpenseModal(true)}
              className="bg-emerald-500 py-3 rounded-xl flex-row items-center justify-center mb-4 shadow-md"
            >
              <Plus size={16} color="#020617" />
              <Text className="text-slate-950 font-black text-xs ml-1.5">
                + GHI NHẬN KHOẢN CHI MỚI
              </Text>
            </TouchableOpacity>

            {/* Expense Entries List */}
            <Text className="text-slate-300 font-black text-sm mb-2">
              Danh Sách Chi Tiêu ({trip.expenseEntries.length})
            </Text>

            {trip.expenseEntries.length === 0 ? (
              <View className="bg-slate-900 border border-slate-800 p-6 rounded-2xl items-center">
                <Text className="text-slate-400 text-xs text-center">
                  Chưa có khoản chi nào được ghi lại.
                </Text>
              </View>
            ) : (
              trip.expenseEntries.map((exp) => {
                const catMeta =
                  EXPENSE_CATEGORIES.find((c) => c.key === exp.category) ||
                  EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

                return (
                  <View
                    key={exp.id}
                    className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-2 flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center mb-1">
                        <View
                          className="px-2 py-0.5 rounded mr-2"
                          style={{ backgroundColor: `${catMeta.color}25` }}
                        >
                          <Text
                            className="text-[10px] font-black"
                            style={{ color: catMeta.color }}
                          >
                            {catMeta.label}
                          </Text>
                        </View>
                        {exp.occurredAt && (
                          <Text className="text-slate-500 text-[10px]">
                            {new Date(exp.occurredAt).toLocaleDateString("vi-VN")}
                          </Text>
                        )}
                      </View>
                      <Text className="text-white font-bold text-sm">{exp.title}</Text>
                      {exp.note && (
                        <Text className="text-slate-400 text-xs mt-0.5">{exp.note}</Text>
                      )}
                    </View>

                    <View className="items-end flex-row items-center space-x-2">
                      <Text className="text-emerald-400 font-black text-sm mr-2">
                        {Number(exp.actualAmount).toLocaleString("vi-VN")}đ
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteExpense(exp.id)}
                        className="p-1"
                      >
                        <Trash2 size={15} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 4: SHARE */}
        {activeTab === "SHARE" && (
          <View>
            {/* Direct Link Share Card */}
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center mb-1">
                <Share2 size={16} color={COLORS.primary} />
                <Text className="text-white font-black text-sm ml-1.5">
                  Chia Sẻ Lịch Trình Nhanh
                </Text>
              </View>
              <Text className="text-slate-400 text-xs mb-3">
                Gửi link chuyến đi cho bạn bè, nhóm bạn cùng tham gia hành trình.
              </Text>
              <TouchableOpacity
                onPress={handleShareLink}
                className="bg-slate-800 border border-slate-700 py-2.5 rounded-xl flex-row items-center justify-center"
              >
                <Share2 size={15} color="#E2E8F0" />
                <Text className="text-slate-200 font-bold text-xs ml-1.5">
                  Gửi link qua Zalo, Messenger, SMS
                </Text>
              </TouchableOpacity>
            </View>

            {/* Share to Community Feed Card */}
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <View className="flex-row items-center mb-1">
                <Send size={16} color="#34D399" />
                <Text className="text-white font-black text-sm ml-1.5">
                  Đăng Lên Bảng Tin Cộng Đồng
                </Text>
              </View>
              <Text className="text-slate-400 text-xs mb-3">
                Chia sẻ trải nghiệm và gợi ý các địa điểm du lịch tuyệt vời cho cộng đồng phượt thủ VTripPlanner.
              </Text>

              {/* Title input */}
              <Text className="text-slate-300 text-xs font-bold mb-1">Tiêu đề bài viết</Text>
              <TextInput
                value={shareHeadline}
                onChangeText={setShareHeadline}
                placeholder="Nhập tiêu đề hấp dẫn..."
                placeholderTextColor="#64748B"
                className="bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl text-xs mb-3"
              />

              {/* Caption input */}
              <Text className="text-slate-300 text-xs font-bold mb-1">Nội dung chia sẻ</Text>
              <TextInput
                value={shareCaption}
                onChangeText={setShareCaption}
                placeholder="Chia sẻ cảm xúc, mẹo di chuyển, chi phí..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
                className="bg-slate-950 border border-slate-800 text-white p-3 rounded-xl text-xs mb-4 min-h-[90px]"
                style={{ textAlignVertical: "top" }}
              />

              <TouchableOpacity
                onPress={handleShareToCommunity}
                disabled={isSharingToFeed}
                className={`bg-emerald-500 py-3 rounded-xl flex-row items-center justify-center shadow-lg ${
                  isSharingToFeed ? "opacity-60" : ""
                }`}
              >
                {isSharingToFeed ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <>
                    <Sparkles size={16} color="#020617" />
                    <Text className="text-slate-950 font-black text-xs ml-1.5">
                      ĐĂNG BÀI LÊN FEED NGAY
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- MODAL: CHANGE STATUS --- */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-5">
          <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-black text-base">Đổi Trạng Thái</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {[
              { key: "PLANNING", label: "Đang lên kế hoạch" },
              { key: "READY", label: "Sẵn sàng khởi hành" },
              { key: "IN_PROGRESS", label: "Đang trong chuyến đi" },
              { key: "COMPLETED", label: "Đã hoàn thành chuyến đi" },
              { key: "CANCELLED", label: "Đã hủy" },
            ].map((st) => (
              <TouchableOpacity
                key={st.key}
                onPress={() => handleUpdateStatus(st.key)}
                className={`py-3 px-3 rounded-xl flex-row items-center justify-between mb-1.5 ${
                  trip.status === st.key ? "bg-emerald-500/20 border border-emerald-500/40" : ""
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    trip.status === st.key ? "text-emerald-400" : "text-slate-300"
                  }`}
                >
                  {st.label}
                </Text>
                {trip.status === st.key && <Check size={16} color="#10B981" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* --- MODAL: RENAME TRIP --- */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-5">
          <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-black text-base">Đổi Tên Chuyến Đi</Text>
              <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={renamedTitle}
              onChangeText={setRenamedTitle}
              className="bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl text-xs mb-4"
              placeholder="Tên chuyến đi..."
              placeholderTextColor="#64748B"
            />

            <TouchableOpacity
              onPress={handleRenameTrip}
              className="bg-emerald-500 py-2.5 rounded-xl items-center"
            >
              <Text className="text-slate-950 font-black text-xs">LƯU THAY ĐỔI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: SET BUDGET --- */}
      <Modal visible={showBudgetModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-5">
          <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-black text-base">Đặt Ngân Sách Dự Kiến</Text>
              <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={newBudgetAmount}
              onChangeText={setNewBudgetAmount}
              keyboardType="numeric"
              placeholder="Nhập số tiền (VNĐ)..."
              placeholderTextColor="#64748B"
              className="bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl text-xs mb-4"
            />

            <TouchableOpacity
              onPress={handleSaveBudget}
              className="bg-emerald-500 py-2.5 rounded-xl items-center"
            >
              <Text className="text-slate-950 font-black text-xs">CẬP NHẬT NGÂN SÁCH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: ADD EXPENSE --- */}
      <Modal visible={showExpenseModal} transparent animationType="slide">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-slate-900 border-t border-slate-800 p-5 rounded-t-3xl">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-black text-base">Thêm Khoản Chi Tiêu</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-xs font-bold mb-1">Tên khoản chi</Text>
            <TextInput
              value={newExpenseTitle}
              onChangeText={setNewExpenseTitle}
              placeholder="Ví dụ: Ăn tối hải sản, Vé cáp treo..."
              placeholderTextColor="#64748B"
              className="bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl text-xs mb-3"
            />

            <Text className="text-slate-400 text-xs font-bold mb-1">Danh mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = newExpenseCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setNewExpenseCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-lg mr-2 border ${
                      isSelected ? "bg-emerald-500/20 border-emerald-400" : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text className="text-slate-400 text-xs font-bold mb-1">Số tiền (VNĐ)</Text>
            <TextInput
              value={newExpenseAmount}
              onChangeText={setNewExpenseAmount}
              keyboardType="numeric"
              placeholder="Ví dụ: 350000"
              placeholderTextColor="#64748B"
              className="bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl text-xs mb-3"
            />

            <Text className="text-slate-400 text-xs font-bold mb-1">Ghi chú (tùy chọn)</Text>
            <TextInput
              value={newExpenseNote}
              onChangeText={setNewExpenseNote}
              placeholder="Ghi chú thêm..."
              placeholderTextColor="#64748B"
              className="bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs mb-4"
            />

            <TouchableOpacity
              onPress={handleAddExpense}
              className="bg-emerald-500 py-3 rounded-xl items-center shadow-lg"
            >
              <Text className="text-slate-950 font-black text-xs">LƯU KHOẢN CHI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
