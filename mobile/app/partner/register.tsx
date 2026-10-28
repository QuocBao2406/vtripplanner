import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Building2, Phone, Mail, Globe, FileText, CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import Haptics from "../../src/utils/haptics";
import { useAuth } from "../../src/context/auth";
import { api } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";

const PARTNER_TYPES = [
  { id: "HOTEL", label: "🏨 Khách sạn" },
  { id: "HOMESTAY", label: "🏡 Homestay & Villa" },
  { id: "RESORT", label: "🌴 Khu nghỉ dưỡng (Resort)" },
  { id: "RESTAURANT", label: "🍽️ Nhà hàng ẩm thực" },
  { id: "EATERY", label: "🍲 Quán ăn đặc sản" },
  { id: "CAFE", label: "☕ Quán Cafe & Trà" },
  { id: "TOURIST_ATTRACTION", label: "🎟️ Điểm tham quan du lịch" },
  { id: "ENTERTAINMENT_VENUE", label: "🎡 Khu vui chơi giải trí" },
  { id: "TRANSPORT_PROVIDER", label: "🚗 Cho thuê xe & Vận chuyển" },
  { id: "RESCUE_SERVICE", label: "🛟 Cứu hộ & Sửa xe phượt" },
  { id: "TRAVEL_SERVICE", label: "🎒 Dịch vụ du lịch / Tour" },
  { id: "OTHER", label: "✨ Dịch vụ khác" },
];

export default function PartnerRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, partner, refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState("HOTEL");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(partner?.approvalStatus || null);

  useEffect(() => {
    if (partner) {
      setName(partner.name || "");
      setType(partner.type || "HOTEL");
      setPhone(partner.phone || "");
      setEmail(partner.email || user?.email || "");
      setStatus(partner.approvalStatus);
    }
  }, [partner, user]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !description.trim()) {
      const msg = "Vui lòng điền đầy đủ tên doanh nghiệp, số điện thoại, email và mô tả dịch vụ.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Thiếu thông tin", msg);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await api.submitPartnerApplication({
        name: name.trim(),
        type,
        description: description.trim(),
        phone: phone.trim(),
        email: email.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        taxCode: taxCode.trim() || undefined,
      });

      await refreshProfile();
      setStatus("PENDING");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const msg = result.message || "Đã gửi hồ sơ Đối tác thành công! Ban Quản trị sẽ xét duyệt trong 24h làm việc.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Thành công", msg);
      }
    } catch (error: any) {
      const msg = error.message || "Không thể gửi hồ sơ.";
      if (Platform.OS === "web") window.alert("Lỗi: " + msg);
      else Alert.alert("Lỗi", msg);
    } finally {
      setIsSubmitting(false);
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
        <Text className="text-white font-black text-base">Đăng Ký Đối Tác Du Lịch</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card if already applied */}
        {status === "PENDING" && (
          <View className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-4 mb-4 flex-row items-start">
            <Clock size={20} color="#F59E0B" className="mt-0.5" />
            <View className="ml-3 flex-1">
              <Text className="text-amber-300 font-bold text-sm">Hồ sơ đang chờ xét duyệt</Text>
              <Text className="text-amber-200/80 text-xs mt-1 leading-5">
                VTripPlanner đang tiến hành xác minh thông tin doanh nghiệp của bạn. Kết quả sẽ được cập nhật trong 24 giờ.
              </Text>
            </View>
          </View>
        )}

        {status === "APPROVED" && (
          <View className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 mb-4 flex-row items-start">
            <CheckCircle2 size={20} color="#10B981" className="mt-0.5" />
            <View className="ml-3 flex-1">
              <Text className="text-emerald-300 font-bold text-sm">Đối tác chính thức đã được duyệt</Text>
              <Text className="text-emerald-200/80 text-xs mt-1 leading-5">
                Tài khoản của bạn đã được cấp quyền Đối Tác. Bạn có thể quản lý địa điểm và phát hành voucher ưu đãi!
              </Text>
            </View>
          </View>
        )}

        {status === "REJECTED" && (
          <View className="bg-red-950/60 border border-red-500/40 rounded-2xl p-4 mb-4 flex-row items-start">
            <XCircle size={20} color="#EF4444" className="mt-0.5" />
            <View className="ml-3 flex-1">
              <Text className="text-red-300 font-bold text-sm">Hồ sơ cần bổ sung thông tin</Text>
              <Text className="text-red-200/80 text-xs mt-1 leading-5">
                {partner?.rejectionReason || "Vui lòng kiểm tra lại tính chính xác của thông tin và gửi lại hồ sơ."}
              </Text>
            </View>
          </View>
        )}

        {/* Benefits Banner */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
          <Text className="text-white font-black text-sm mb-2 flex-row items-center">
            🚀 Quyền lợi Đối tác VTripPlanner
          </Text>
          <Text className="text-slate-300 text-xs leading-5">
            • Tiếp cận hơn 50,000+ phượt thủ & khách du lịch tự túc mỗi tháng.{"\n"}
            • Được AI ưu tiên gợi ý trong các lịch trình tối ưu cung đường.{"\n"}
            • Tự do phát hành voucher và quản lý mã QR quét giảm giá trực tiếp.
          </Text>
        </View>

        {/* Form Fields */}
        <View className="space-y-4">
          {/* Business Name */}
          <View>
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Tên cơ sở kinh doanh / Doanh nghiệp *
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <Building2 size={18} color="#64748B" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="VD: Homestay Mây Lang Thang Đà Lạt"
                placeholderTextColor="#475569"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Business Type Chips */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-2">
              Lĩnh vực hoạt động *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PARTNER_TYPES.map((t) => {
                const isSelected = type === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setType(t.id);
                    }}
                    className={`px-3 py-2 rounded-xl border ${
                      isSelected
                        ? "bg-emerald-950 border-emerald-500"
                        : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Phone */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Số điện thoại liên hệ đối tác *
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <Phone size={18} color="#64748B" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="VD: 0987654321"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Email */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Email đối tác *
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <Mail size={18} color="#64748B" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="VD: contact@maylangthang.vn"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Website */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Website hoặc Fanpage Facebook (tùy chọn)
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <Globe size={18} color="#64748B" />
              <TextInput
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="VD: https://facebook.com/homestay..."
                placeholderTextColor="#475569"
                autoCapitalize="none"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Tax Code */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Mã số thuế / Giấy phép kinh doanh (nếu có)
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <FileText size={18} color="#64748B" />
              <TextInput
                value={taxCode}
                onChangeText={setTaxCode}
                placeholder="VD: 0312345678"
                placeholderTextColor="#475569"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Description */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Mô tả giới thiệu dịch vụ & địa điểm *
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Giới thiệu về tiện nghi, phong cảnh, món ăn hoặc dịch vụ nổi bật của bạn..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={4}
                className="text-white text-sm font-medium h-24"
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="mt-6 bg-emerald-500 py-3.5 rounded-2xl items-center shadow-lg shadow-emerald-500/25"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <Text className="text-slate-950 font-black text-sm">
              {status === "PENDING" ? "CẬP NHẬT LẠI HỒ SƠ" : "GỬI HỒ SƠ XÉT DUYỆT"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
