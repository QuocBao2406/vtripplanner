import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}

export function BrandLogo({ size = "md", showSubtitle = false }: BrandLogoProps) {
  const iconSize = size === "sm" ? 32 : size === "lg" ? 52 : 40;
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <View className="flex-row items-center">
      <View
        style={{ width: iconSize, height: iconSize }}
        className="rounded-xl overflow-hidden bg-emerald-950/40 items-center justify-center mr-2.5 shadow-md shadow-emerald-500/20"
      >
        <Image
          source={require("../../assets/vtripplanner-scenic-mark.png")}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          transition={150}
        />
      </View>

      <View>
        <Text className={`font-black tracking-tight text-white ${textSize}`}>
          VTrip
          <Text className="text-emerald-400">Planner</Text>
        </Text>
        {showSubtitle && (
          <Text className="text-slate-400 text-[11px] font-medium mt-0.5">
            Lập lịch trình & Cộng đồng phượt
          </Text>
        )}
      </View>
    </View>
  );
}
