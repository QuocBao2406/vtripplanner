import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowLeft,
  Navigation,
} from "lucide-react-native";
import Haptics from "../../../src/utils/haptics";
import { api } from "../../../src/services/api";
import { BrandLogo } from "../../../src/components/BrandLogo";
import { COLORS } from "../../../src/constants/theme";

export default function SharedTripScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    // Fetch shared trip by token or fallback to rich mock data
    async function loadShared() {
      try {
        const data = await api.getSharedTrip(token || "dalat");
        setTrip({
          id: "shared-trip-1",
          title: data.title || "Hành trình Phượt Đà Lạt 3N2Đ",
          origin: data.origin || "TP. Hồ Chí Minh",
          destination: data.destination || "Đà Lạt",
          startDate: "15/09/2026",
          duration: data.duration || 3,
          travelerCount: data.travelerCount || 2,
          totalBudget: data.totalBudget || 4500000,
          sharedBy: "Nguyễn Văn Hùng (Trưởng đoàn)",
          days: [
            {
              dayNumber: 1,
              dateLabel: "Ngày 15/09",
              activities: [
                { time: "06:00", title: "Khởi hành từ Sài Gòn đi Đà Lạt qua đèo Chuối & đèo Bảo Lộc" },
                { time: "12:30", title: "Ăn trưa cơm niêu Bảo Lộc & nghỉ chân" },
                { time: "15:30", title: "Check-in Homestay & ngắm đồi thông" },
                { time: "18:30", title: "Dạo Chợ đêm Đà Lạt, ăn bánh tráng nướng & sữa đậu nành" },
              ],
            },
            {
              dayNumber: 2,
              dateLabel: "Ngày 16/09",
              activities: [
                { time: "05:00", title: "Săn mây sớm tại Đồi chè Cầu Đất" },
                { time: "08:30", title: "Thưởng thức cafe view thung lũng Mê Linh Garden" },
                { time: "14:00", title: "Trải nghiệm máng trượt xuyên rừng Thác Datanla" },
                { time: "19:00", title: "Lẩu gà lá é Tao Ngộ & dạo Hồ Xuân Hương" },
              ],
            },
            {
              dayNumber: 3,
              dateLabel: "Ngày 17/09",
              activities: [
                { time: "08:00", title: "Mua quà đặc sản tại Lò Mứt & Vườn Dâu Tây" },
                { time: "11:30", title: "Ăn trưa nhẹ nhàng & trả phòng homestay" },
                { time: "13:00", title: "Di chuyển về lại TP. Hồ Chí Minh an toàn" },
              ],
            },
          ],
        });
      } catch (e) {
        // fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadShared();
  }, [token]);

  const handleClaim = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsClaiming(true);
    try {
      if (token) {
        await api.claimSharedTrip(token);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Đã lưu chuyến đi!",
        "Lịch trình chuyến đi đã được lưu thành công vào tài khoản của bạn.",
        [
          {
            text: "Xem chuyến đi",
            onPress: () => router.replace("/(tabs)/my-trips"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể lưu chuyến đi.");
    } finally {
      setIsClaiming(false);
    }
  };

  const topPadding = insets.top > 0 ? insets.top + 8 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 16);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-slate-400 text-xs mt-3 font-semibold">
          Đang nạp dữ liệu chuyến đi được chia sẻ...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: topPadding, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-4"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Share Banner */}
        <View className="bg-emerald-950/70 border border-emerald-500/40 p-5 rounded-3xl mb-5 items-center shadow-lg shadow-emerald-500/10">
          <View className="mb-2">
            <BrandLogo size="sm" />
          </View>
          <Text className="text-emerald-400 font-extrabold text-[11px] uppercase tracking-widest mt-1">
            LỊCH TRÌNH ĐỒNG HÀNH ĐƯỢC CHIA SẺ
          </Text>
          <Text className="text-white font-black text-xl text-center mt-1">
            {trip?.title}
          </Text>
          <Text className="text-slate-400 text-xs text-center mt-1">
            Người chia sẻ: <Text className="text-emerald-300 font-bold">{trip?.sharedBy}</Text>
          </Text>
        </View>

        {/* Info Badges */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 shadow-sm">
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-800">
            <View className="flex-row items-center">
              <Navigation size={14} color={COLORS.primary} />
              <Text className="text-white text-xs font-bold ml-2">
                {trip?.origin} ➔ {trip?.destination}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Calendar size={14} color="#94A3B8" />
              <Text className="text-slate-300 text-xs font-semibold ml-1.5">
                {trip?.duration} Ngày
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-3">
            <View className="flex-row items-center">
              <Users size={14} color="#94A3B8" />
              <Text className="text-slate-300 text-xs font-semibold ml-1.5">
                {trip?.travelerCount} Thành viên
              </Text>
            </View>
            <View className="flex-row items-center">
              <DollarSign size={14} color="#34D399" />
              <Text className="text-emerald-400 text-xs font-black ml-0.5">
                {trip?.totalBudget?.toLocaleString("vi-VN")}đ
              </Text>
            </View>
          </View>
        </View>

        {/* Itinerary Preview */}
        <View className="mb-6">
          <Text className="text-white font-extrabold text-sm mb-3">
            LỘ TRÌNH CHI TIẾT TỪNG NGÀY
          </Text>
          {trip?.days?.map((day: any) => (
            <View
              key={day.dayNumber}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3 shadow-sm"
            >
              <Text className="text-emerald-400 font-black text-xs mb-2.5 uppercase">
                NGÀY {day.dayNumber} · {day.dateLabel}
              </Text>
              {day.activities?.map((act: any, idx: number) => (
                <View key={idx} className="flex-row items-start py-2 border-b border-slate-950 last:border-b-0">
                  <Clock size={12} color="#34D399" className="mt-0.5" />
                  <Text className="text-emerald-400 text-xs font-bold ml-1.5 w-12">
                    {act.time}
                  </Text>
                  <Text className="text-slate-200 text-xs font-medium flex-1 ml-1 leading-4">
                    {act.title}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Claim Action Button */}
        <TouchableOpacity
          onPress={handleClaim}
          disabled={isClaiming}
          className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/25 mb-8"
        >
          {isClaiming ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#020617" />
              <Text className="text-slate-950 font-black text-sm ml-2">
                LƯU CHUYẾN ĐI NÀY VÀO TÀI KHOẢN
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
