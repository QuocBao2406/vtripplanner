import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Shield, CheckCircle2, XCircle, Clock, Building2, Users, FileText, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import Haptics from "../../src/utils/haptics";
import { useAuth } from "../../src/context/auth";
import { api } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();

  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getAdminPartners().catch(() => ({ partners: [] }));
      setPartners(data.partners || []);
    } catch (error) {
      console.warn("Failed to load admin data:", error);
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

  const handleReview = async (partnerId: string, decision: "APPROVE" | "REJECT") => {
    setProcessingId(partnerId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.reviewAdminPartner(partnerId, decision);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "web") {
        window.alert(decision === "APPROVE" ? "Đã duyệt đối tác thành công!" : "Đã từ chối hồ sơ đối tác.");
      } else {
        Alert.alert("Thành công", decision === "APPROVE" ? "Đã duyệt đối tác thành công!" : "Đã từ chối hồ sơ đối tác.");
      }
      loadData();
    } catch (error: any) {
      const msg = error.message || "Không thể thực hiện thao tác.";
      if (Platform.OS === "web") window.alert("Lỗi: " + msg);
      else Alert.alert("Lỗi", msg);
    } finally {
      setProcessingId(null);
    }
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
          <Text className="text-white font-black text-base">Trung Tâm Quản Trị</Text>
          <Text className="text-purple-400 text-[10px] font-bold">👑 ADMIN CONSOLE</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Admin Banner */}
        <View className="bg-gradient-to-r from-purple-950/70 to-slate-900 border border-purple-500/40 rounded-3xl p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-purple-400 font-extrabold text-xs">QUYỀN QUẢN TRỊ CAO NHẤT</Text>
              <Text className="text-white font-black text-lg mt-0.5">
                {user?.email?.split("@")[0] || "Administrator"}
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Giám sát hệ thống & phê duyệt hồ sơ đối tác
              </Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 items-center justify-center">
              <Shield size={24} color="#A855F7" />
            </View>
          </View>
        </View>

        {/* Header Title */}
        <View className="flex-row items-center justify-between mb-3 mt-1">
          <Text className="text-white font-black text-sm">Hồ Sơ Đối Tác Cần Duyệt</Text>
          <Text className="text-purple-400 text-xs font-bold">{partners.length} hồ sơ</Text>
        </View>

        {/* Partners List */}
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#A855F7" />
            <Text className="text-slate-400 text-xs mt-3 font-semibold">Đang tải danh sách quản trị...</Text>
          </View>
        ) : partners.length === 0 ? (
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 items-center">
            <CheckCircle2 size={36} color="#10B981" />
            <Text className="text-white font-bold text-sm mt-3">Không có hồ sơ chờ duyệt</Text>
            <Text className="text-slate-400 text-xs text-center mt-1">
              Toàn bộ hồ sơ đăng ký đối tác đã được xử lý xong.
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {partners.map((partner) => {
              const isPending = partner.approvalStatus === "PENDING";
              const isApproved = partner.approvalStatus === "APPROVED";
              const isProcessing = processingId === partner.id;

              return (
                <View
                  key={partner.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-white font-black text-sm">{partner.name}</Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        {partner.type} • SĐT: {partner.phone}
                      </Text>
                      <Text className="text-slate-500 text-[11px] mt-0.5">
                        Email: {partner.email}
                      </Text>
                    </View>
                    <View
                      className={`px-2.5 py-1 rounded-full border ${
                        isApproved
                          ? "bg-emerald-950 border-emerald-500/40"
                          : isPending
                          ? "bg-amber-950 border-amber-500/40"
                          : "bg-red-950 border-red-500/40"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          isApproved
                            ? "text-emerald-400"
                            : isPending
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {isApproved ? "Đã duyệt" : isPending ? "Chờ duyệt" : "Từ chối"}
                      </Text>
                    </View>
                  </View>

                  {partner.description && (
                    <Text className="text-slate-300 text-xs mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-5">
                      {partner.description}
                    </Text>
                  )}

                  {/* Actions for Pending partners */}
                  {isPending && (
                    <View className="flex-row space-x-2 mt-3 pt-3 border-t border-slate-800/80">
                      <TouchableOpacity
                        onPress={() => handleReview(partner.id, "APPROVE")}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-500 py-2.5 rounded-xl items-center flex-row justify-center"
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#020617" />
                        ) : (
                          <>
                            <CheckCircle2 size={15} color="#020617" />
                            <Text className="text-slate-950 font-black text-xs ml-1.5">DUYỆT</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleReview(partner.id, "REJECT")}
                        disabled={isProcessing}
                        className="flex-1 bg-red-950/80 border border-red-500/40 py-2.5 rounded-xl items-center flex-row justify-center"
                      >
                        <XCircle size={15} color="#EF4444" />
                        <Text className="text-red-400 font-bold text-xs ml-1.5">TỪ CHỐI</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
