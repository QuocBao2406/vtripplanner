import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Building2, MapPin, Tag, Plus, Eye, QrCode, TrendingUp, CheckCircle, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import Haptics from "../../src/utils/haptics";
import { useAuth } from "../../src/context/auth";
import { api } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";

export default function PartnerDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, partner, isPartner } = useAuth();

  const [places, setPlaces] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"places" | "vouchers">("places");

  const loadData = useCallback(async () => {
    try {
      const [placesRes, promoRes] = await Promise.all([
        api.getPartnerPlaces().catch(() => ({ places: [] })),
        api.getPartnerPromotions().catch(() => ({ promotions: [] })),
      ]);
      setPlaces(placesRes.places || []);
      setPromotions(promoRes.promotions || []);
    } catch (error) {
      console.warn("Failed to load partner data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const topPadding = insets.top > 0 ? insets.top + 8 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 16);

  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View style={{ paddingTop: topPadding }} className="px-4 pb-3 bg-slate-900 border-b border-slate-800 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-white font-black text-base">Kênh Đối Tác Du Lịch</Text>
          <Text className="text-amber-400 text-[10px] font-bold">🏢 PARTNER HUB</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/partner/register")}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700"
        >
          <Building2 size={18} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Partner Info Banner */}
        <View className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/30 rounded-3xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-amber-400 font-extrabold text-xs">DOANH NGHIỆP ĐÃ XÁC THỰC</Text>
              <Text className="text-white font-black text-lg mt-0.5" numberOfLines={1}>
                {partner?.name || "Đối tác VTripPlanner"}
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Loại hình: {partner?.type || "Dịch vụ du lịch"} • SĐT: {partner?.phone || "Chưa cập nhật"}
              </Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 items-center justify-center">
              <Building2 size={24} color="#F59E0B" />
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row space-x-3 mb-5">
          <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 items-center">
            <Text className="text-amber-400 font-black text-xl">{places.length}</Text>
            <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">Địa điểm</Text>
          </View>
          <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 items-center">
            <Text className="text-amber-400 font-black text-xl">{promotions.length}</Text>
            <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">Voucher</Text>
          </View>
          <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 items-center">
            <Text className="text-amber-400 font-black text-xl">1.2k</Text>
            <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">Lượt xem</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-slate-900 p-1 rounded-2xl border border-slate-800 mb-4">
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("places");
            }}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              activeTab === "places" ? "bg-amber-500" : ""
            }`}
          >
            <MapPin size={15} color={activeTab === "places" ? "#020617" : "#94A3B8"} />
            <Text
              className={`text-xs font-black ml-1.5 ${
                activeTab === "places" ? "text-slate-950" : "text-slate-400"
              }`}
            >
              Địa Điểm ({places.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("vouchers");
            }}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              activeTab === "vouchers" ? "bg-amber-500" : ""
            }`}
          >
            <Tag size={15} color={activeTab === "vouchers" ? "#020617" : "#94A3B8"} />
            <Text
              className={`text-xs font-black ml-1.5 ${
                activeTab === "vouchers" ? "text-slate-950" : "text-slate-400"
              }`}
            >
              Mã Ưu Đãi ({promotions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content list */}
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-slate-400 text-xs mt-3 font-semibold">Đang tải dữ liệu đối tác...</Text>
          </View>
        ) : activeTab === "places" ? (
          places.length === 0 ? (
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 items-center">
              <MapPin size={36} color="#475569" />
              <Text className="text-white font-bold text-sm mt-3">Chưa có địa điểm nào</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Thêm khách sạn, quán ăn hoặc điểm tham quan của bạn lên bản đồ VTripPlanner.
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {places.map((place) => (
                <View
                  key={place.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-bold text-sm flex-1 mr-2">{place.name}</Text>
                    <View className="bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <Text className="text-emerald-400 text-[10px] font-bold">Hoạt động</Text>
                    </View>
                  </View>
                  <Text className="text-slate-400 text-xs mt-1">{place.address || "Địa chỉ cập nhật trên bản đồ"}</Text>
                </View>
              ))}
            </View>
          )
        ) : promotions.length === 0 ? (
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 items-center">
            <Tag size={36} color="#475569" />
            <Text className="text-white font-bold text-sm mt-3">Chưa có chương trình ưu đãi nào</Text>
            <Text className="text-slate-400 text-xs text-center mt-1">
              Tạo voucher giảm giá để thu hút phượt thủ đến cơ sở của bạn.
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {promotions.map((promo) => (
              <View
                key={promo.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-bold text-sm flex-1 mr-2">{promo.title}</Text>
                  <Text className="text-amber-400 font-black text-sm">
                    {promo.discountType === "PERCENT" ? `-${promo.discountValue}%` : `-${(promo.discountValue / 1000).toLocaleString()}k`}
                  </Text>
                </View>
                <Text className="text-slate-400 text-xs mt-1">{promo.description}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
