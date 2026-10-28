import React, { useState } from "react";
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
import { ArrowLeft, User, Phone, MapPin, Calendar, FileText, CheckCircle2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import Haptics from "../../src/utils/haptics";
import { useAuth } from "../../src/context/auth";
import { api } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || user?.user_metadata?.display_name || "");
  const [fullName, setFullName] = useState(profile?.fullName || user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "");
  const [city, setCity] = useState(profile?.city || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.updateProfile({
        displayName: displayName.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        city: city.trim(),
        bio: bio.trim(),
      });

      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (Platform.OS === "web") {
        window.alert("Cập nhật hồ sơ thành công!");
        router.back();
      } else {
        Alert.alert("Thành công", "Hồ sơ cá nhân đã được cập nhật.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      const msg = error.message || "Không thể cập nhật hồ sơ.";
      if (Platform.OS === "web") {
        window.alert("Lỗi: " + msg);
      } else {
        Alert.alert("Lỗi", msg);
      }
    } finally {
      setIsSaving(false);
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
        <Text className="text-white font-black text-base">Chỉnh Sửa Hồ Sơ</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className="bg-emerald-500 px-3.5 py-2 rounded-xl flex-row items-center"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <Text className="text-slate-950 font-black text-xs">LƯU</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 py-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-4">
          {/* Display Name */}
          <View>
            <Text className="text-slate-300 font-bold text-xs mb-1.5 flex-row items-center">
              Tên hiển thị / Biệt danh
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <User size={18} color="#64748B" />
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="VD: Bảo Phượt Thủ"
                placeholderTextColor="#475569"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Full Name */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Họ và tên đầy đủ
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <User size={18} color="#64748B" />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="VD: Nguyễn Quốc Bảo"
                placeholderTextColor="#475569"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Phone */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Số điện thoại liên hệ
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <Phone size={18} color="#64748B" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="VD: 0912345678"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* City */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Tỉnh / Thành phố sinh sống
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <MapPin size={18} color="#64748B" />
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="VD: TP. Hồ Chí Minh"
                placeholderTextColor="#475569"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Date of Birth */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Ngày sinh (YYYY-MM-DD)
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex-row items-center">
              <Calendar size={18} color="#64748B" />
              <TextInput
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="VD: 2000-01-01"
                placeholderTextColor="#475569"
                className="flex-1 ml-3 text-white text-sm font-semibold"
              />
            </View>
          </View>

          {/* Bio */}
          <View className="mt-3">
            <Text className="text-slate-300 font-bold text-xs mb-1.5">
              Giới thiệu bản thân / Câu châm ngôn du lịch
            </Text>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Chia sẻ đôi nét về gu du lịch, các cung đường bạn yêu thích..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={4}
                className="text-white text-sm font-medium h-24"
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className="mt-6 bg-emerald-500 py-3.5 rounded-2xl items-center shadow-lg shadow-emerald-500/25"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <Text className="text-slate-950 font-black text-sm">
              LƯU THAY ĐỔI
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
