import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Sparkles,
  Clock,
  MapPin,
  Users,
  Wallet,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Check,
  SlidersHorizontal,
  Share2,
  BookmarkCheck,
  Search,
  X,
  Navigation,
  ArrowRight,
  Flame,
} from "lucide-react-native";
import Haptics from "../../src/utils/haptics";
import { useRouter } from "expo-router";
import { api, type TripTransportMode, type TripPlanningRequest } from "../../src/services/api";
import { ALL_VIETNAM_PROVINCES, type ProvinceOption } from "../../src/constants/mockData";
import { COLORS } from "../../src/constants/theme";

const POPULAR_DESTINATIONS = ALL_VIETNAM_PROVINCES.filter((p) => p.isPopular);

const INTERESTS_OPTIONS = [
  { id: "nature", label: "🏔️ Săn mây & Cảnh đẹp" },
  { id: "food", label: "🍜 Ẩm thực đặc sản" },
  { id: "culture", label: "🏛️ Văn hóa & Di tích" },
  { id: "chill", label: "☕ Cafe & Nghỉ dưỡng" },
  { id: "local", label: "🏕️ Trải nghiệm bản địa" },
  { id: "checkin", label: "📸 Check-in sống ảo" },
];

const TRAVEL_PACES = [
  { id: "RELAXED", label: "Thư thả", desc: "1-2 điểm/ngày, nhiều thời gian nghỉ" },
  { id: "BALANCED", label: "Cân bằng", desc: "3-4 điểm/ngày, lịch trình tối ưu" },
  { id: "ACTIVE", label: "Năng động", desc: "5+ điểm/ngày, phượt khám phá tối đa" },
];

const REGION_TABS = ["🔥 Điểm HOT", "Tất cả", "Bắc", "Trung", "Tây Nguyên", "Nam"];

export default function TripPlannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Wizard States (strictly selected from structured list)
  const [origin, setOrigin] = useState<ProvinceOption>(
    ALL_VIETNAM_PROVINCES.find((p) => p.id === "ho-chi-minh") || ALL_VIETNAM_PROVINCES[0]
  );
  const [destination, setDestination] = useState<ProvinceOption>(
    ALL_VIETNAM_PROVINCES.find((p) => p.id === "lam-dong") || ALL_VIETNAM_PROVINCES[0]
  );
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [departureTime, setDepartureTime] = useState("06:00");
  const [transportMode, setTransportMode] = useState<TripTransportMode>("MOTORBIKE");
  const [duration, setDuration] = useState(3);
  const [travelerCount, setTravelerCount] = useState(2);
  const [totalBudget, setTotalBudget] = useState(5000000);
  const [travelPace, setTravelPace] = useState("BALANCED");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "🏔️ Săn mây & Cảnh đẹp",
    "🍜 Ẩm thực đặc sản",
  ]);

  // Modal selector states
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [pickingTarget, setPickingTarget] = useState<"origin" | "destination">("destination");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedRegionTab, setSelectedRegionTab] = useState("🔥 Điểm HOT");
  const [selectedDayTab, setSelectedDayTab] = useState(1);

  // Status & Generated Plan
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);

  const openPicker = (target: "origin" | "destination") => {
    Haptics.selectionAsync();
    setPickingTarget(target);
    setLocationSearch("");
    setSelectedRegionTab("🔥 Điểm HOT");
    setIsLocationModalOpen(true);
  };

  const handleSelectLocation = (loc: ProvinceOption) => {
    Haptics.selectionAsync();
    if (pickingTarget === "origin") {
      setOrigin(loc);
    } else {
      setDestination(loc);
    }
    setIsLocationModalOpen(false);
  };

  const toggleInterest = (label: string) => {
    Haptics.selectionAsync();
    setSelectedInterests((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : prev.length < 5
        ? [...prev, label]
        : prev
    );
  };

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsLoading(true);
    setSelectedDayTab(1);
    try {
      const payload: TripPlanningRequest = {
        origin: origin.name,
        destination: destination.shortName.replace(/\(.*?\)/g, "").trim(),
        startDate,
        departureTime,
        transportMode,
        duration,
        travelerCount,
        totalBudget,
        interests: selectedInterests,
      };

      const result = await api.generatePlan(payload);
      setGeneratedPlan(result.plan);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể tạo lịch trình.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!generatedPlan) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.saveTrip({
        origin: generatedPlan.origin,
        destination: generatedPlan.destination,
        startDate: generatedPlan.startDate,
        departureTime: generatedPlan.departureTime,
        transportMode: generatedPlan.transportMode,
        duration: generatedPlan.duration,
        travelerCount: generatedPlan.travelerCount,
        totalBudget: generatedPlan.totalBudget,
        interests: generatedPlan.interests,
        days: generatedPlan.days,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Đã lưu chuyến đi!", "Chuyến đi đã được thêm vào danh sách quản lý của bạn.", [
        {
          text: "Xem chuyến đi",
          onPress: () => router.push("/(tabs)/my-trips"),
        },
        { text: "Ở lại", style: "cancel" },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể lưu chuyến đi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!generatedPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const token = `trip-${destination.id}-${duration}d`;
    const shareUrl = `https://vtripplanner.vn/trip/share/${token}`;
    try {
      await Share.share({
        message: `🧭 VTripPlanner AI: Lịch trình du lịch ${generatedPlan.destination} (${generatedPlan.duration} ngày) cùng ${generatedPlan.travelerCount} người với ngân sách ${generatedPlan.totalBudget?.toLocaleString("vi-VN")}đ.\n👉 Xem chi tiết lịch trình: ${shareUrl}`,
        url: shareUrl,
        title: `Lịch trình du lịch ${generatedPlan.destination}`,
      });
    } catch (e) {
      // ignore
    }
  };

  // Filter locations for modal
  const filteredLocations = ALL_VIETNAM_PROVINCES.filter((item) => {
    const matchesSearch =
      item.shortName.toLowerCase().includes(locationSearch.toLowerCase()) ||
      item.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
      (item.tagline && item.tagline.toLowerCase().includes(locationSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedRegionTab === "🔥 Điểm HOT") return item.isPopular;
    if (selectedRegionTab === "Tất cả") return true;
    return item.region === selectedRegionTab;
  });

  const topPadding = insets.top > 0 ? insets.top + 8 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 16);

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: topPadding, paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Title */}
        <View className="mb-5">
          <View className="flex-row items-center space-x-1.5 mb-1.5">
            <Sparkles size={16} color={COLORS.primary} />
            <Text className="text-emerald-400 font-extrabold text-xs uppercase tracking-widest ml-1">
              AI Smart Trip Planner
            </Text>
          </View>
          <Text className="text-white font-black text-2xl tracking-tight">
            Lập Lịch Trình Thông Minh
          </Text>
          <Text className="text-slate-400 text-xs mt-1 leading-5">
            Chọn điểm đến chính xác từ hệ thống dữ liệu, tối ưu cung đường & ngân sách theo giờ thực tế.
          </Text>
        </View>

        {/* --- Form Container --- */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-sm">
          {/* Section 1: Route */}
          <Text className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase mb-3">
            1. TUYẾN ĐƯỜNG & KHỞI HÀNH
          </Text>

          {/* Origin Selector Card */}
          <View className="mb-3.5">
            <Text className="text-slate-300 text-xs font-bold mb-1.5">
              ĐIỂM XUẤT PHÁT (BẤM ĐỂ CHỌN)
            </Text>
            <TouchableOpacity
              onPress={() => openPicker("origin")}
              className="flex-row items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-3.5 active:border-emerald-500"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/40 items-center justify-center">
                  <Navigation size={18} color={COLORS.primary} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-black text-sm">
                    {origin.shortName}
                  </Text>
                  <Text className="text-slate-400 text-[11px]">
                    Khu vực: Miền {origin.region}
                  </Text>
                </View>
              </View>
              <View className="bg-slate-800 px-3 py-1.5 rounded-xl">
                <Text className="text-emerald-400 font-bold text-xs">Thay đổi</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Destination Selector Card */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-bold mb-1.5">
              ĐIỂM ĐẾN DU LỊCH (BẤM ĐỂ CHỌN)
            </Text>
            <TouchableOpacity
              onPress={() => openPicker("destination")}
              className="flex-row items-center justify-between bg-slate-950 border-2 border-emerald-500/50 rounded-2xl p-3.5 shadow-sm shadow-emerald-500/10"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-emerald-500 items-center justify-center">
                  <MapPin size={18} color="#020617" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-emerald-300 font-black text-base">
                    {destination.shortName}
                  </Text>
                  <Text className="text-slate-400 text-[11px]" numberOfLines={1}>
                    {destination.tagline || `Khu vực: Miền ${destination.region}`}
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-500 px-3 py-1.5 rounded-xl">
                <Text className="text-slate-950 font-black text-xs">Chọn nơi khác</Text>
              </View>
            </TouchableOpacity>

            {/* Quick popular destination chips */}
            <View className="mt-2.5">
              <Text className="text-slate-400 text-[11px] font-semibold mb-1.5">
                GỢI Ý ĐIỂM ĐẾN NỔI BẬT:
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {POPULAR_DESTINATIONS.slice(0, 6).map((dest) => (
                  <TouchableOpacity
                    key={dest.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDestination(dest);
                    }}
                    className={`px-3 py-1.5 rounded-xl border ${
                      destination.id === dest.id
                        ? "bg-emerald-950 border-emerald-500"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        destination.id === dest.id ? "text-emerald-300 font-black" : "text-slate-400"
                      }`}
                    >
                      {dest.shortName.split("(")[0].trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Date & Time */}
          <View className="flex-row space-x-3 mb-4">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-bold mb-1.5">
                NGÀY ĐI
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                <Calendar size={14} color="#94A3B8" />
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748B"
                  className="flex-1 text-white text-xs font-bold ml-2"
                />
              </View>
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-slate-300 text-xs font-bold mb-1.5">
                GIỜ KHỞI HÀNH
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                <Clock size={14} color="#94A3B8" />
                <TextInput
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="06:00"
                  placeholderTextColor="#64748B"
                  className="flex-1 text-white text-xs font-bold ml-2"
                />
              </View>
            </View>
          </View>

          <View className="h-[1px] bg-slate-800 my-2" />

          {/* Section 2: Vehicle & Duration */}
          <Text className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase my-3">
            2. PHƯƠNG TIỆN & THỜI GIAN
          </Text>

          {/* Transport Mode */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-bold mb-2">
              PHƯƠNG TIỆN DI CHUYỂN
            </Text>
            <View className="flex-row space-x-2">
              {[
                { id: "MOTORBIKE", label: "🏍️ Xe máy phượt" },
                { id: "CAR", label: "🚗 Ô tô tự lái" },
                { id: "COACH", label: "🚌 Xe khách" },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTransportMode(m.id as TripTransportMode);
                  }}
                  className={`flex-1 py-3 rounded-xl border items-center justify-center ${
                    transportMode === m.id
                      ? "bg-emerald-950 border-emerald-500 shadow-sm"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      transportMode === m.id ? "text-emerald-400" : "text-slate-400"
                    }`}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Duration & Members */}
          <View className="flex-row space-x-3 mb-4">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-bold mb-2">
                SỐ NGÀY: <Text className="text-emerald-400">{duration} Ngày</Text>
              </Text>
              <View className="flex-row bg-slate-950 border border-slate-800 rounded-xl p-1 justify-between">
                {[1, 2, 3, 4, 5].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDuration(d);
                    }}
                    className={`flex-1 py-2 rounded-lg items-center ${
                      duration === d ? "bg-emerald-500" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-xs font-black ${
                        duration === d ? "text-slate-950" : "text-slate-400"
                      }`}
                    >
                      {d}N
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4 bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <View className="flex-row items-center">
              <Users size={16} color="#94A3B8" />
              <Text className="text-slate-300 text-xs font-bold ml-2">
                SỐ THÀNH VIÊN ĐI CÙNG
              </Text>
            </View>
            <View className="flex-row items-center space-x-3">
              <TouchableOpacity
                onPress={() => setTravelerCount(Math.max(1, travelerCount - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 items-center justify-center"
              >
                <Text className="text-white font-bold text-base">-</Text>
              </TouchableOpacity>
              <Text className="text-emerald-400 font-black text-sm w-6 text-center">
                {travelerCount}
              </Text>
              <TouchableOpacity
                onPress={() => setTravelerCount(travelerCount + 1)}
                className="w-8 h-8 rounded-lg bg-slate-800 items-center justify-center"
              >
                <Text className="text-white font-bold text-base">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="h-[1px] bg-slate-800 my-2" />

          {/* Section 3: Budget & Travel Pace */}
          <Text className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase my-3">
            3. DỰ TOÁN NGÂN SÁCH & NHỊP ĐỘ
          </Text>

          {/* Budget */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-bold mb-1.5">
              TỔNG NGÂN SÁCH DỰ KIẾN (VND)
            </Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3">
              <Wallet size={18} color="#34D399" />
              <TextInput
                value={totalBudget.toLocaleString("vi-VN")}
                onChangeText={(text) => {
                  const numeric = parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
                  setTotalBudget(numeric);
                }}
                keyboardType="numeric"
                className="flex-1 text-emerald-400 text-base font-black ml-2.5"
              />
              <Text className="text-slate-400 text-xs font-bold">VND</Text>
            </View>
          </View>

          {/* Travel Pace */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-bold mb-2">
              NHỊP ĐỘ CHUYẾN ĐI
            </Text>
            <View className="space-y-2">
              {TRAVEL_PACES.map((pace) => {
                const isSelected = travelPace === pace.id;
                return (
                  <TouchableOpacity
                    key={pace.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTravelPace(pace.id);
                    }}
                    className={`p-3 rounded-xl border flex-row items-center justify-between ${
                      isSelected
                        ? "bg-emerald-950/60 border-emerald-500"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <View>
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {pace.label}
                      </Text>
                      <Text className="text-slate-400 text-[11px] mt-0.5">
                        {pace.desc}
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Interests */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-bold mb-2">
              SỞ THÍCH DU LỊCH (CHỌN TỐI ĐA 5)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {INTERESTS_OPTIONS.map((item) => {
                const isSelected = selectedInterests.includes(item.label);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleInterest(item.label)}
                    className={`px-3 py-2 rounded-xl border ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-slate-950 font-black" : "text-slate-300"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isLoading}
            className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center mt-3 shadow-lg shadow-emerald-500/25"
          >
            {isLoading ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <>
                <Sparkles size={20} color="#020617" />
                <Text className="text-slate-950 font-black text-sm ml-2">
                  TẠO LỊCH TRÌNH AI NGAY
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* --- Generated Results --- */}
        {generatedPlan && (
          <View className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 mb-8 shadow-xl">
            {/* Header Result */}
            <View className="flex-row items-start justify-between pb-4 border-b border-slate-800">
              <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-1">
                  <Sparkles size={14} color={COLORS.primary} />
                  <Text className="text-emerald-400 font-extrabold text-xs ml-1 uppercase">
                    KẾT QUẢ GỢI Ý THÔNG MINH
                  </Text>
                </View>
                <Text className="text-white font-black text-xl">
                  {generatedPlan.origin} ➔ {generatedPlan.destination}
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  {generatedPlan.duration} ngày · {generatedPlan.travelerCount} người · {generatedPlan.transportMode === "MOTORBIKE" ? "Xe máy" : "Ô tô"}
                </Text>
              </View>
              <View className="bg-emerald-950 border border-emerald-500/40 px-3 py-1 rounded-full">
                <Text className="text-emerald-300 font-bold text-xs">
                  {generatedPlan.budgetEstimate?.profileLabel || "Cân bằng"}
                </Text>
              </View>
            </View>

            {/* Travel Estimate Banner */}
            {generatedPlan.travelEstimate && (
              <View className="bg-slate-950 rounded-2xl p-3.5 my-4 border border-slate-800">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Navigation size={14} color="#34D399" />
                    <Text className="text-slate-300 text-xs font-bold ml-1.5">
                      Quãng đường: {generatedPlan.travelEstimate.distanceKm} km
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Clock size={14} color="#F59E0B" />
                    <Text className="text-amber-400 text-xs font-bold ml-1.5">
                      Thời gian: ~{Math.round(generatedPlan.travelEstimate.durationMinutes / 60)} giờ
                    </Text>
                  </View>
                </View>
                <View className="mt-2 pt-2 border-t border-slate-900 flex-row items-center">
                  <ShieldCheck size={14} color="#10B981" />
                  <Text className="text-emerald-400 text-[11px] font-semibold ml-1.5 flex-1">
                    Cung đường đã được tính toán lộ trình chuẩn xác khớp với dữ liệu hệ thống.
                  </Text>
                </View>
              </View>
            )}

            {/* Budget Breakdown */}
            {generatedPlan.budgetEstimate && (
              <View className="bg-slate-950 rounded-2xl p-4 mb-4 border border-slate-800">
                <Text className="text-slate-300 text-xs font-extrabold mb-2.5">
                  PHÂN BỔ CHI PHÍ GỢI Ý (TỔNG {generatedPlan.totalBudget?.toLocaleString("vi-VN")}đ)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <View className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex-1 min-w-[45%]">
                    <Text className="text-slate-400 text-[10px] font-bold">XĂNG XE / DI CHUYỂN</Text>
                    <Text className="text-emerald-400 font-extrabold text-xs mt-0.5">
                      {generatedPlan.budgetEstimate.transportCost?.toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                  <View className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex-1 min-w-[45%]">
                    <Text className="text-slate-400 text-[10px] font-bold">LƯU TRÚ / HOMESTAY</Text>
                    <Text className="text-emerald-400 font-extrabold text-xs mt-0.5">
                      {generatedPlan.budgetEstimate.accommodationCost?.toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                  <View className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex-1 min-w-[45%]">
                    <Text className="text-slate-400 text-[10px] font-bold">ĂN UỐNG ĐẶC SẢN</Text>
                    <Text className="text-emerald-400 font-extrabold text-xs mt-0.5">
                      {generatedPlan.budgetEstimate.foodCost?.toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                  <View className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex-1 min-w-[45%]">
                    <Text className="text-slate-400 text-[10px] font-bold">VÉ THAM QUAN & DỰ PHÒNG</Text>
                    <Text className="text-emerald-400 font-extrabold text-xs mt-0.5">
                      {generatedPlan.budgetEstimate.activityCost?.toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Day Switcher Tabs */}
            <View className="mb-4">
              <Text className="text-white font-extrabold text-sm mb-2.5">
                CHI TIẾT HOẠT ĐỘNG THEO GIỜ
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {generatedPlan.days?.map((day: any) => {
                  const isTabActive = selectedDayTab === day.dayNumber;
                  return (
                    <TouchableOpacity
                      key={day.dayNumber}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedDayTab(day.dayNumber);
                      }}
                      className={`px-4 py-2 rounded-xl border ${
                        isTabActive
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-xs font-black ${
                          isTabActive ? "text-slate-950" : "text-slate-300"
                        }`}
                      >
                        Ngày {day.dayNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selected Day Timeline */}
            {generatedPlan.days
              ?.filter((d: any) => d.dayNumber === selectedDayTab)
              .map((day: any) => (
                <View key={day.dayNumber} className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800/80 mb-4">
                  <View className="flex-row items-center justify-between pb-2 mb-2 border-b border-slate-900">
                    <Text className="text-emerald-400 font-black text-xs">
                      {day.dateLabel} · Khám phá {generatedPlan.destination}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/trip/customize")}
                      className="flex-row items-center"
                    >
                      <SlidersHorizontal size={12} color={COLORS.primary} />
                      <Text className="text-emerald-400 text-xs font-bold ml-1">Tùy chỉnh</Text>
                    </TouchableOpacity>
                  </View>

                  {day.activities?.map((act: any, idx: number) => (
                    <View
                      key={idx}
                      className="flex-row items-start py-2.5 border-b border-slate-900 last:border-b-0"
                    >
                      <View className="w-14">
                        <Text className="text-emerald-400 font-bold text-xs">
                          {act.time}
                        </Text>
                      </View>
                      <View className="flex-1 ml-2">
                        <Text className="text-white font-bold text-sm">
                          {act.placeName}
                        </Text>
                        <Text className="text-slate-400 text-[11px] mt-0.5">
                          {idx === 0
                            ? "Khởi đầu ngày mới, check-in ngắm cảnh & chụp hình"
                            : idx === 1
                            ? "Thưởng thức ẩm thực trưa & nghỉ ngơi thư giãn"
                            : "Hoạt động trải nghiệm chiều, ngắm hoàng hôn & ẩm thực đêm"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}

            {/* Actions: Save & Share */}
            <View className="flex-row space-x-3 mt-3">
              <TouchableOpacity
                onPress={handleSaveTrip}
                disabled={isSaving}
                className="flex-1 bg-emerald-500 py-3.5 rounded-xl flex-row items-center justify-center shadow-md shadow-emerald-500/25"
              >
                {isSaving ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <>
                    <BookmarkCheck size={18} color="#020617" />
                    <Text className="text-slate-950 font-black text-xs ml-1.5">
                      LƯU CHUYẾN ĐI
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                className="bg-slate-800 border border-slate-700 px-4 py-3.5 rounded-xl flex-row items-center justify-center"
              >
                <Share2 size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-xs ml-1.5">CHIA SẺ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- Location Selection Modal (Strict Select from Available Places) --- */}
      <Modal
        visible={isLocationModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsLocationModalOpen(false)}
      >
        <View className="flex-1 bg-black/85 justify-end">
          <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <MapPin size={20} color={COLORS.primary} />
                <Text className="text-white font-black text-lg ml-2">
                  {pickingTarget === "origin" ? "Chọn Điểm Xuất Phát" : "Chọn Điểm Đến Du Lịch"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsLocationModalOpen(false)}
                className="bg-slate-800 p-2 rounded-full"
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-xs mb-3">
              Chọn từ danh sách địa điểm chuẩn hóa để đảm bảo hệ thống tính toán chính xác lộ trình và địa điểm du lịch.
            </Text>

            {/* Search Input */}
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 mb-3">
              <Search size={16} color="#64748B" />
              <TextInput
                value={locationSearch}
                onChangeText={setLocationSearch}
                placeholder="Tìm tỉnh thành (VD: Đà Lạt, Hà Giang, Phú Quốc...)"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm ml-2"
                autoFocus={false}
              />
              {locationSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLocationSearch("")}>
                  <X size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Region Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-1.5 mb-3"
              contentContainerStyle={{ paddingVertical: 2 }}
            >
              {REGION_TABS.map((tab) => {
                const isActive = selectedRegionTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedRegionTab(tab);
                    }}
                    className={`px-3 py-1.5 rounded-xl border ${
                      isActive
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? "text-slate-950 font-black" : "text-slate-400"
                      }`}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Locations List */}
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const isSelected =
                  (pickingTarget === "origin" && origin.id === item.id) ||
                  (pickingTarget === "destination" && destination.id === item.id);

                return (
                  <TouchableOpacity
                    onPress={() => handleSelectLocation(item)}
                    className={`py-3.5 px-3.5 mb-2 rounded-2xl border flex-row items-center justify-between ${
                      isSelected
                        ? "bg-emerald-950/60 border-emerald-500"
                        : "bg-slate-950 border-slate-800/80"
                    }`}
                  >
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <Text className="text-white font-bold text-sm">
                          {item.shortName}
                        </Text>
                        {item.isPopular && (
                          <View className="bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md ml-2 flex-row items-center">
                            <Flame size={10} color="#F59E0B" />
                            <Text className="text-amber-300 text-[10px] font-bold ml-0.5">HOT</Text>
                          </View>
                        )}
                      </View>
                      {item.tagline && (
                        <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                          {item.tagline}
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-center">
                      <View className="bg-slate-900 px-2 py-1 rounded-md mr-2">
                        <Text className="text-slate-400 text-[10px] font-bold">
                          Miền {item.region}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Check size={18} color={COLORS.primary} />
                      ) : (
                        <ChevronRight size={16} color="#64748B" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
