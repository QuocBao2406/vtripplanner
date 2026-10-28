import { Platform } from "react-native";
import Constants from "expo-constants";

export const COLORS = {
  primary: "#10B981", // Emerald 500
  primaryDark: "#059669", // Emerald 600
  primaryLight: "#D1FAE5", // Emerald 100
  primaryMuted: "#064E3B", // Emerald 900
  
  bgDark: "#020617", // Slate 950
  bgDarkCard: "#0F172A", // Slate 900
  bgDarkBorder: "#1E293B", // Slate 800
  
  bgLight: "#F8FAFC", // Slate 50
  bgLightCard: "#FFFFFF",
  bgLightBorder: "#E2E8F0", // Slate 200
  
  textDark: "#020617",
  textMuted: "#64748B",
  textLight: "#F8FAFC",
  textLightMuted: "#94A3B8",
  
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#3B82F6",
};

function getDefaultApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location) {
      const hostname = window.location.hostname || "localhost";
      return `http://${hostname}:3000`;
    }
    return "http://localhost:3000";
  }

  // Auto-detect host IP from Expo Metro bundler connection (LAN mode)
  const hostUri = 
    Constants.expoConfig?.hostUri || 
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost || 
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:3000`;
    }
  }

  // Fallback to current PC Wi-Fi IP for physical devices connected via LAN
  return "http://172.27.37.133:3000";
}

export const API_BASE_URL = getDefaultApiBaseUrl();
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://pdagqtaxuientvtwdfql.supabase.co";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_cajW5YV3ifkiAD9jBmwVQA_1tMsy6Mp";

export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
}
