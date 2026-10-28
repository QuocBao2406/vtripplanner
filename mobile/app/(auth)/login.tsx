import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { Mail, Lock, ArrowLeft } from "lucide-react-native";
import Haptics from "../../src/utils/haptics";
import { supabase } from "../../src/lib/supabase";
import { BrandLogo } from "../../src/components/BrandLogo";
import { COLORS } from "../../src/constants/theme";
import { useAuth } from "../../src/context/auth";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      const msg = "Vui lòng nhập đầy đủ Email và Mật khẩu.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Lỗi", msg);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        const msg = error.message || "Đăng nhập thất bại.";
        if (Platform.OS === "web") window.alert("Đăng nhập thất bại: " + msg);
        else Alert.alert("Đăng nhập thất bại", msg);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (err: any) {
      const msg = err.message || "Đã xảy ra lỗi khi đăng nhập.";
      if (Platform.OS === "web") window.alert("Lỗi: " + msg);
      else Alert.alert("Lỗi", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const topPadding = insets.top > 0 ? insets.top + 8 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 16);

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: topPadding, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-6"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View className="items-center mb-8">
          <BrandLogo size="lg" showSubtitle />
          <Text className="text-white font-black text-2xl mt-4">Chào Mừng Trở Lại</Text>
          <Text className="text-slate-400 text-xs mt-1 text-center">
            Đăng nhập để đồng bộ lịch trình & voucher trên cả Web và Mobile
          </Text>
        </View>

        <View className="bg-slate-900 border border-slate-800 p-5 rounded-3xl mb-6 shadow-sm">
          <View>
            <Text className="text-slate-300 text-xs font-bold mb-1.5">EMAIL TÀI KHOẢN</Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3">
              <Mail size={16} color="#64748B" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm ml-2.5"
              />
            </View>
          </View>

          <View className="mt-3.5">
            <Text className="text-slate-300 text-xs font-bold mb-1.5">MẬT KHẨU</Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3">
              <Lock size={16} color="#64748B" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm ml-2.5"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            className="w-full bg-emerald-500 py-3.5 rounded-xl items-center justify-center mt-5 shadow-md shadow-emerald-500/25"
          >
            {isLoading ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <Text className="text-slate-950 font-black text-sm">ĐĂNG NHẬP NGAY</Text>
            )}
          </TouchableOpacity>

          {/* Quick test accounts for easy testing */}
          <View className="mt-5 pt-4 border-t border-slate-800/80">
            <Text className="text-slate-400 text-[11px] font-semibold mb-2 text-center">
              Tài khoản kiểm thử nhanh (chạm để điền):
            </Text>
            <View className="flex-row items-center justify-between gap-1.5">
              <TouchableOpacity
                onPress={() => {
                  setEmail("admin.vtripplanner@example.com");
                  setPassword("Password123@");
                }}
                className="flex-1 bg-amber-500/10 border border-amber-500/30 py-2 rounded-lg items-center active:opacity-70"
              >
                <Text className="text-amber-400 font-bold text-[11px]">👑 Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEmail("partner.vtripplanner@example.com");
                  setPassword("Password123@");
                }}
                className="flex-1 bg-sky-500/10 border border-sky-500/30 py-2 rounded-lg items-center active:opacity-70"
              >
                <Text className="text-sky-400 font-bold text-[11px]">🏢 Đối tác</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEmail("user.vtripplanner@example.com");
                  setPassword("Password123@");
                }}
                className="flex-1 bg-emerald-500/10 border border-emerald-500/30 py-2 rounded-lg items-center active:opacity-70"
              >
                <Text className="text-emerald-400 font-bold text-[11px]">👤 User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-center space-x-1.5">
          <Text className="text-slate-400 text-xs">Chưa có tài khoản?</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-emerald-400 font-bold text-xs ml-1">Đăng ký thành viên</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
