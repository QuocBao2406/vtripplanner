import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { AuthProvider } from "../src/context/auth";
import "../global.css";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Handle incoming deep links (e.g. vtripplanner://trip/share/xyz)
    const handleDeepLink = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path && parsed.path.startsWith("trip/share/")) {
        router.push(`/${parsed.path}` as any);
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#020617" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: "#020617",
            },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: {
              fontWeight: "bold",
            },
            contentStyle: {
              backgroundColor: "#020617",
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)/login"
            options={{ title: "Đăng nhập", presentation: "modal" }}
          />
          <Stack.Screen
            name="(auth)/register"
            options={{ title: "Đăng ký", presentation: "modal" }}
          />
          <Stack.Screen
            name="trip/customize"
            options={{ title: "Tùy chỉnh lịch trình", headerBackTitle: "Quay lại" }}
          />
          <Stack.Screen
            name="trip/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="trip/share/[token]"
            options={{ title: "Chuyến đi được chia sẻ", presentation: "modal" }}
          />
          <Stack.Screen
            name="places/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="social/my-posts"
            options={{ title: "Bài viết của tôi", headerBackTitle: "Quay lại" }}
          />
          <Stack.Screen
            name="social/saved"
            options={{ title: "Bài viết đã lưu", headerBackTitle: "Quay lại" }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
