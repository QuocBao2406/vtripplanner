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
import { useRouter } from "expo-router";
import { Mail, Lock, User, ArrowLeft } from "lucide-react-native";
import Haptics from "../../src/utils/haptics";
import { supabase } from "../../src/lib/supabase";
import { BrandLogo } from "../../src/components/BrandLogo";
import { api } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      const msg = "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Lỗi", msg);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      await api.register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto sign-in immediately after registration
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!loginError) {
        if (Platform.OS === "web") {
          window.alert("🎉 Tạo tài khoản thành công và đã tự động đăng nhập!");
        }
        router.replace("/(tabs)/profile");
      } else {
        if (Platform.OS === "web") {
          window.alert("Tạo tài khoản thành công! Hãy đăng nhập để tiếp tục.");
          router.replace("/(auth)/login");
        } else {
          Alert.alert(
            "Thành công",
            "Tài khoản đã được tạo thành công! Hãy đăng nhập để trải nghiệm.",
            [{ text: "Đăng nhập", onPress: () => router.replace("/(auth)/login") }]
          );
        }
      }
    } catch (err: any) {
      const msg = err.message || "Đã xảy ra lỗi khi đăng ký.";
      if (Platform.OS === "web") window.alert("Lỗi đăng ký: " + msg);
      else Alert.alert("Lỗi đăng ký", msg);
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
          <Text className="text-white font-black text-2xl mt-4">Tạo Tài Khoản</Text>
          <Text className="text-slate-400 text-xs mt-1 text-center">
            Tham gia cộng đồng phượt thủ và trải nghiệm lập lịch thông minh
          </Text>
        </View>

        <View className="bg-slate-900 border border-slate-800 p-5 rounded-3xl mb-6 shadow-sm">
          <View>
            <Text className="text-slate-300 text-xs font-bold mb-1.5">HỌ VÀ TÊN</Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3">
              <User size={16} color="#64748B" />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm ml-2.5"
              />
            </View>
          </View>

          <View className="mt-3.5">
            <Text className="text-slate-300 text-xs font-bold mb-1.5">EMAIL</Text>
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
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm ml-2.5"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            className="w-full bg-emerald-500 py-3.5 rounded-xl items-center justify-center mt-5 shadow-md shadow-emerald-500/25"
          >
            {isLoading ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <Text className="text-slate-950 font-black text-sm">HOÀN TẤT ĐĂNG KÝ</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-center space-x-1.5">
          <Text className="text-slate-400 text-xs">Đã có tài khoản?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-emerald-400 font-bold text-xs ml-1">Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
