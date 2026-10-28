import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  User,
  Bookmark,
  MapPinned,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  Shield,
  Building2,
  Crown,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  BookmarkCheck,
} from "lucide-react-native";
import Haptics from "../../src/utils/haptics";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/auth";
import { COLORS, resolveMediaUrl } from "../../src/constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, partner, isAdmin, isPartner, signOut } = useAuth();

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  const topPadding = insets.top > 0 ? insets.top + 8 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 16);

  const displayName =
    profile?.displayName ||
    profile?.fullName ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Thành viên VTrip";

  const avatarUrl = resolveMediaUrl(profile?.avatarUrl || user?.user_metadata?.avatar_url);

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: topPadding, paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 items-center mb-4 shadow-sm relative">
          {/* Role Badge */}
          {user && (
            <View className="mb-3">
              {isAdmin ? (
                <View className="bg-purple-950/90 border border-purple-500/50 px-3 py-1 rounded-full flex-row items-center">
                  <Crown size={13} color="#C084FC" />
                  <Text className="text-purple-300 text-[11px] font-black ml-1.5">
                    QUẢN TRỊ VIÊN HỆ THỐNG
                  </Text>
                </View>
              ) : isPartner ? (
                <View className="bg-amber-950/90 border border-amber-500/50 px-3 py-1 rounded-full flex-row items-center">
                  <Building2 size={13} color="#FBBF24" />
                  <Text className="text-amber-300 text-[11px] font-black ml-1.5">
                    ĐỐI TÁC CHÍNH THỨC
                  </Text>
                </View>
              ) : (
                <View className="bg-emerald-950/90 border border-emerald-500/50 px-3 py-1 rounded-full flex-row items-center">
                  <Sparkles size={13} color="#34D399" />
                  <Text className="text-emerald-300 text-[11px] font-black ml-1.5">
                    THÀNH VIÊN DU LỊCH
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Avatar */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#064E3B",
              borderWidth: 2,
              borderColor: isAdmin ? "#A855F7" : isPartner ? "#F59E0B" : "#10B981",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Text className="text-white font-black text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <Text className="text-white font-black text-lg text-center">
            {displayName}
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5 text-center">
            {user?.email || "Chưa đăng nhập tài khoản"}
          </Text>

          {profile?.city && (
            <Text className="text-slate-500 text-[11px] mt-1">
              📍 {profile.city}
            </Text>
          )}

          {user ? (
            <TouchableOpacity
              onPress={() => router.push("/profile/edit")}
              className="mt-3 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex-row items-center"
            >
              <Edit3 size={14} color="#94A3B8" />
              <Text className="text-slate-200 font-bold text-xs ml-1.5">
                Chỉnh sửa hồ sơ
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              className="mt-4 bg-emerald-500 px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/25"
            >
              <Text className="text-slate-950 font-extrabold text-xs">
                ĐĂNG NHẬP / ĐĂNG KÝ
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <View className="flex-row space-x-3 mb-4">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/my-trips")}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 items-center"
          >
            <Text className="text-emerald-400 font-black text-xl">3</Text>
            <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">
              Chuyến đi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/vouchers")}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 items-center"
          >
            <Text className="text-emerald-400 font-black text-xl">5</Text>
            <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">
              Mã Voucher
            </Text>
          </TouchableOpacity>
          <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 items-center">
            <Text className="text-emerald-400 font-black text-xl">12</Text>
            <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">
              Check-in
            </Text>
          </View>
        </View>

        {/* ADMIN SPECIAL CONSOLE SECTION (TIER 3) */}
        {isAdmin && (
          <View className="mb-4">
            <Text className="text-purple-400 font-black text-xs uppercase tracking-wider mb-2 ml-1">
              👑 KHU VỰC QUẢN TRỊ VIÊN
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/admin/dashboard")}
              className="bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-500/40 rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-purple-500/20 items-center justify-center border border-purple-500/30">
                  <Shield size={20} color="#C084FC" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-black text-sm">
                    Trung Tâm Quản Trị Hệ Thống
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    Xét duyệt đối tác, quản lý người dùng & dữ liệu
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#C084FC" />
            </TouchableOpacity>
          </View>
        )}

        {/* PARTNER HUB / REGISTRATION SECTION (TIER 2) */}
        <View className="mb-4">
          <Text className="text-amber-400 font-black text-xs uppercase tracking-wider mb-2 ml-1">
            🏢 KÊNH ĐỐI TÁC DOANH NGHIỆP
          </Text>

          {isPartner ? (
            <TouchableOpacity
              onPress={() => router.push("/partner/dashboard")}
              className="bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/40 rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-amber-500/20 items-center justify-center border border-amber-500/30">
                  <Building2 size={20} color="#FBBF24" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-black text-sm">
                    Kênh Đối Tác Du Lịch (Partner Hub)
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    Quản lý địa điểm, dịch vụ lưu trú & phát hành voucher
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#FBBF24" />
            </TouchableOpacity>
          ) : partner?.approvalStatus === "PENDING" ? (
            <TouchableOpacity
              onPress={() => router.push("/partner/register")}
              className="bg-amber-950/50 border border-amber-500/30 rounded-2xl p-3.5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <Clock size={18} color="#F59E0B" />
                <View className="ml-2.5 flex-1">
                  <Text className="text-amber-300 font-bold text-xs">
                    Hồ sơ đối tác đang chờ duyệt
                  </Text>
                  <Text className="text-slate-400 text-[11px] mt-0.5">
                    Bấm để xem hoặc cập nhật thông tin đã gửi
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#F59E0B" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/partner/register")}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center">
                  <Building2 size={20} color="#94A3B8" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-bold text-sm">
                    Đăng Ký Trở Thành Đối Tác
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    Dành cho khách sạn, nhà hàng, homestay, điểm vui chơi
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* GENERAL USER MENU ITEMS (TIER 1) */}
        <View className="mb-4">
          <Text className="text-slate-400 font-black text-xs uppercase tracking-wider mb-2 ml-1">
            🎒 TIỆN ÍCH PHƯỢT THỦ
          </Text>
          <View className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/my-trips")}
              className="flex-row items-center justify-between p-4 border-b border-slate-800/80"
            >
              <View className="flex-row items-center space-x-3">
                <MapPinned size={18} color={COLORS.primary} />
                <Text className="text-white font-bold text-sm ml-3">
                  Lịch trình chuyến đi của tôi
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push((user ? "/social/my-posts" : "/(auth)/login") as any)}
              className="flex-row items-center justify-between p-4 border-b border-slate-800/80"
            >
              <View className="flex-row items-center space-x-3">
                <FileText size={18} color={COLORS.primary} />
                <Text className="text-white font-bold text-sm ml-3">
                  Bài viết của tôi
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push((user ? "/social/saved" : "/(auth)/login") as any)}
              className="flex-row items-center justify-between p-4 border-b border-slate-800/80"
            >
              <View className="flex-row items-center space-x-3">
                <BookmarkCheck size={18} color={COLORS.primary} />
                <Text className="text-white font-bold text-sm ml-3">
                  Bài viết đã lưu
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/vouchers")}
              className="flex-row items-center justify-between p-4 border-b border-slate-800/80"
            >
              <View className="flex-row items-center space-x-3">
                <Bookmark size={18} color={COLORS.primary} />
                <Text className="text-white font-bold text-sm ml-3">
                  Ví voucher & Mã quét QR ưu đãi
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/planner")}
              className="flex-row items-center justify-between p-4 border-b border-slate-800/80"
            >
              <View className="flex-row items-center space-x-3">
                <Sparkles size={18} color={COLORS.primary} />
                <Text className="text-white font-bold text-sm ml-3">
                  Lập kế hoạch du lịch thông minh AI
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center space-x-3">
                <Shield size={18} color={COLORS.primary} />
                <Text className="text-white font-bold text-sm ml-3">
                  Cứu hộ khẩn cấp & An toàn phượt
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        {user && (
          <TouchableOpacity
            onPress={handleLogout}
            className="w-full bg-slate-900 border border-red-500/30 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 mt-2"
          >
            <LogOut size={16} color={COLORS.danger} />
            <Text className="text-red-500 font-extrabold text-xs ml-2">
              ĐĂNG XUẤT TÀI KHOẢN
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
