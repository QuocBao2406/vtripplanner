import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ticket, QrCode, X, Clock, MapPin, CheckCircle2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api, type PromotionVoucherItem } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";

export default function VouchersScreen() {
  const [promotions, setPromotions] = useState<PromotionVoucherItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<PromotionVoucherItem | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchVouchers = useCallback(async () => {
    try {
      const data = await api.getVouchers();
      setPromotions(data);
    } catch (error) {
      console.warn("Failed to fetch vouchers:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchVouchers();
  };

  const handleClaimOrOpen = async (promo: PromotionVoucherItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (promo.myClaim) {
      setSelectedVoucher(promo);
      return;
    }

    setIsClaiming(true);
    try {
      const res = await api.claimVoucher(promo.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Thành công", res.message || "Đã lưu voucher vào tài khoản của bạn!");
      fetchVouchers();
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể nhận voucher.");
    } finally {
      setIsClaiming(false);
    }
  };

  const renderVoucher = ({ item }: { item: PromotionVoucherItem }) => {
    const isClaimed = Boolean(item.myClaim);
    const discountText =
      item.discountType === "PERCENT"
        ? `GIẢM ${item.discountValue}%`
        : `GIẢM ${item.discountValue.toLocaleString("vi-VN")}đ`;

    return (
      <View className="bg-slate-900 border border-slate-800 mx-3.5 my-2 rounded-2xl p-4 shadow-sm">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-md self-start mb-2">
              <Text className="text-emerald-400 font-extrabold text-xs">
                {discountText}
              </Text>
            </View>
            <Text className="text-white font-extrabold text-base mb-1">
              {item.title}
            </Text>
            <Text className="text-slate-400 text-xs font-semibold">
              {item.partnerName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleClaimOrOpen(item)}
            className={`p-3 rounded-xl items-center justify-center shadow-lg ${
              isClaimed ? "bg-emerald-500" : "bg-slate-800 border border-emerald-500/40"
            }`}
          >
            <QrCode size={24} color={isClaimed ? "#020617" : "#34D399"} />
            <Text
              className={`font-black text-[10px] mt-1 ${
                isClaimed ? "text-slate-950" : "text-emerald-400"
              }`}
            >
              {isClaimed ? "XEM QR" : "NHẬN MÃ"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
          <View className="flex-row items-center flex-1 mr-2">
            <MapPin size={12} color="#94A3B8" />
            <Text className="text-slate-400 text-xs ml-1 font-medium" numberOfLines={1}>
              {item.places.map((p) => p.name).join(", ") || "Nhiều địa điểm"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Clock size={12} color="#94A3B8" />
            <Text className="text-slate-400 text-xs ml-1">
              HSD: {new Date(item.endAt).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="p-4 bg-slate-950 border-b border-slate-800">
        <View className="flex-row items-center space-x-1.5 mb-1">
          <Ticket size={16} color={COLORS.primary} />
          <Text className="text-emerald-400 font-extrabold text-xs uppercase tracking-widest ml-1">
            ƯU ĐÃI ĐỐI TÁC
          </Text>
        </View>
        <Text className="text-white font-black text-xl">
          Ví Voucher & Khuyến Mãi Du Lịch
        </Text>
        <Text className="text-slate-400 text-xs mt-1">
          Đồng bộ trực tiếp với danh sách ưu đãi đối tác trên Web.
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-slate-400 text-xs mt-3">Đang tải danh sách ưu đãi...</Text>
        </View>
      ) : promotions.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-slate-400 text-sm text-center">
            Hiện chưa có ưu đãi đối tác nào khả dụng.
          </Text>
        </View>
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => item.id}
          renderItem={renderVoucher}
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

      {/* QR Code Modal */}
      <Modal
        visible={selectedVoucher !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVoucher(null)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-4">
          <View className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 items-center">
            <TouchableOpacity
              onPress={() => setSelectedVoucher(null)}
              className="absolute top-4 right-4 bg-slate-800 p-2 rounded-full"
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full mb-3">
              <Text className="text-emerald-400 font-extrabold text-xs">
                MÃ QR SỬ DỤNG
              </Text>
            </View>

            <Text className="text-white font-black text-lg text-center mb-1">
              {selectedVoucher?.title}
            </Text>
            <Text className="text-slate-400 text-xs text-center mb-5">
              {selectedVoucher?.partnerName}
            </Text>

            {/* QR Code Box */}
            <View className="bg-white p-4 rounded-2xl mb-4 items-center justify-center border-4 border-emerald-500">
              <QrCode size={180} color="#020617" />
              <Text className="text-slate-950 font-mono font-black text-sm mt-2 tracking-widest">
                {selectedVoucher?.myClaim?.code || "VTP-PROMO-QR"}
              </Text>
            </View>

            <View className="flex-row items-center text-emerald-400 mb-4">
              <CheckCircle2 size={16} color={COLORS.primary} />
              <Text className="text-emerald-400 text-xs font-bold ml-1.5">
                Khả dụng Offline (Quét tại quầy)
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedVoucher(null)}
              className="w-full bg-slate-800 py-3 rounded-xl items-center justify-center"
            >
              <Text className="text-white font-extrabold text-xs">ĐÓNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
