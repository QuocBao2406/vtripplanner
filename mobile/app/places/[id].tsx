import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Linking,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Share2,
  MapPin,
  Star,
  Clock,
  Ticket,
  Calendar,
  Phone,
  Globe,
  Navigation,
  Sparkles,
  ShieldCheck,
  Check,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { api, type PlaceDetailItem } from "../../src/services/api";
import { COLORS } from "../../src/constants/theme";
import SafeHaptics from "../../src/utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [place, setPlace] = useState<PlaceDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchPlace = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getPlaceDetail(id);
      setPlace(data);
    } catch (error) {
      console.warn("Failed to fetch place detail:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlace();
  }, [fetchPlace]);

  const handleShare = async () => {
    if (!place) return;
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Medium);
    const url = `https://vtripplanner.vn/dia-diem/${place.slug}`;
    try {
      await Share.share({
        message: `📍 Khám phá ${place.name} tại ${place.provinceName} cùng VTripPlanner:\n${url}`,
        url,
        title: place.name,
      });
    } catch {
      // Ignored
    }
  };

  const handleOpenMap = () => {
    if (!place) return;
    SafeHaptics.selectionAsync();
    let mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${place.name} ${place.addressLine} ${place.provinceName}`
    )}`;
    if (place.latitude && place.longitude) {
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    }
    Linking.openURL(mapUrl).catch(() => {});
  };

  const handleCall = (phone: string) => {
    SafeHaptics.selectionAsync();
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, "")}`).catch(() => {});
  };

  const handleOpenWebsite = (url: string) => {
    SafeHaptics.selectionAsync();
    const finalUrl = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(finalUrl).catch(() => {});
  };

  const handlePlanWithPlace = () => {
    if (!place) return;
    SafeHaptics.impactAsync(SafeHaptics.ImpactFeedbackStyle.Heavy);
    router.push(`/(tabs)/planner` as any);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-slate-400 text-xs mt-3">Đang tải thông tin địa điểm...</Text>
      </SafeAreaView>
    );
  }

  if (!place) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <Text className="text-white font-bold text-lg mb-2">Không tìm thấy địa điểm</Text>
        <Text className="text-slate-400 text-xs text-center mb-4">
          Địa điểm du lịch này có thể tạm thời không khả dụng hoặc đã bị gỡ.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-emerald-500 px-4 py-2.5 rounded-xl"
        >
          <Text className="text-slate-950 font-black text-xs">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const galleryImages =
    place.images && place.images.length > 0
      ? place.images
      : place.coverImageUrl
      ? [{ id: "cover", url: place.coverImageUrl, isCover: true }]
      : [];

  const minPrice = place.prices && place.prices.length > 0 ? place.prices[0] : null;

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Hero Image Carousel */}
        <View style={{ width: "100%", height: 320, position: "relative", backgroundColor: "#020617" }}>
          {galleryImages.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImageIndex(slide);
              }}
              scrollEventThrottle={16}
            >
              {galleryImages.map((img, idx) => (
                <View key={img.id || idx} style={{ width: SCREEN_WIDTH, height: 320 }}>
                  <Image
                    source={{ uri: img.url || place.coverImageUrl || "" }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    priority="high"
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View className="w-full h-full bg-slate-900 items-center justify-center">
              <MapPin size={48} color="#334155" />
            </View>
          )}

          {/* Image Dots Indicator */}
          {galleryImages.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center space-x-1.5">
              {galleryImages.map((_, idx) => (
                <View
                  key={idx}
                  className={`h-1.5 rounded-full ${
                    activeImageIndex === idx ? "w-6 bg-emerald-400" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </View>
          )}

          {/* Floating Navigation Header */}
          <SafeAreaView className="absolute top-0 left-0 right-0">
            <View className="flex-row items-center justify-between px-4 pt-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-black/60 items-center justify-center backdrop-blur-md"
              >
                <ArrowLeft size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                className="w-10 h-10 rounded-full bg-black/60 items-center justify-center backdrop-blur-md"
              >
                <Share2 size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Place Main Information */}
        <View className="p-4 -mt-4 bg-slate-950 rounded-t-3xl border-t border-slate-800/80">
          {/* Category & Province Badges */}
          <View className="flex-row items-center flex-wrap gap-2 mb-2">
            <View className="bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full flex-row items-center">
              <ShieldCheck size={12} color="#10B981" />
              <Text className="text-emerald-400 font-extrabold text-[11px] ml-1">
                ĐÃ XÁC THỰC
              </Text>
            </View>

            <View className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
              <Text className="text-slate-300 font-bold text-[11px]">
                {place.categoryName}
              </Text>
            </View>

            <View className="bg-sky-950/60 border border-sky-500/40 px-2.5 py-1 rounded-full">
              <Text className="text-sky-400 font-bold text-[11px]">
                {place.provinceName}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text className="text-white font-black text-2xl leading-tight mb-2">
            {place.name}
          </Text>

          {/* Rating and Reviews */}
          <View className="flex-row items-center mb-4">
            <View className="flex-row items-center bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 mr-2">
              <Star size={13} color="#F59E0B" fill="#F59E0B" />
              <Text className="text-amber-400 font-black text-xs ml-1">
                {place.averageRating ? place.averageRating.toFixed(1) : "5.0"}
              </Text>
            </View>
            <Text className="text-slate-400 text-xs">
              ({place.reviewCount || 1} đánh giá từ cộng đồng)
            </Text>
          </View>

          {/* Address & Navigation Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenMap}
            className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex-row items-center justify-between mb-4"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mr-3">
                <MapPin size={18} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-xs">Địa chỉ</Text>
                <Text className="text-slate-400 text-xs mt-0.5 leading-snug" numberOfLines={2}>
                  {place.addressLine}
                  {place.ward ? `, ${place.ward}` : ""}
                  {place.districtName ? `, ${place.districtName}` : ""}
                  {`, ${place.provinceName}`}
                </Text>
              </View>
            </View>
            <View className="bg-emerald-500 px-3 py-1.5 rounded-xl flex-row items-center">
              <Navigation size={12} color="#020617" />
              <Text className="text-slate-950 font-black text-[11px] ml-1">Bản đồ</Text>
            </View>
          </TouchableOpacity>

          {/* Section: Giới thiệu */}
          <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
            <View className="flex-row items-center mb-2">
              <Info size={16} color={COLORS.primary} />
              <Text className="text-white font-black text-sm ml-1.5">Giới Thiệu Địa Điểm</Text>
            </View>
            <Text className="text-slate-300 text-xs leading-relaxed">
              {place.description || place.shortDescription}
            </Text>
          </View>

          {/* Section: Mùa Đẹp Nhất */}
          {place.bestVisitMonths && place.bestVisitMonths.length > 0 && (
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center mb-2">
                <Calendar size={16} color="#38BDF8" />
                <Text className="text-white font-black text-sm ml-1.5">
                  Thời Điểm Lý Tưởng Để Đi
                </Text>
              </View>
              <Text className="text-slate-400 text-xs mb-3">
                {place.seasonNote || "Những tháng trong năm có khí hậu và cảnh sắc đẹp nhất tại điểm này:"}
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                  const isIdeal = place.bestVisitMonths.includes(m);
                  return (
                    <View
                      key={m}
                      className={`px-2.5 py-1 rounded-lg border ${
                        isIdeal
                          ? "bg-sky-500/20 border-sky-400"
                          : "bg-slate-950 border-slate-800/80 opacity-40"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          isIdeal ? "text-sky-300 font-black" : "text-slate-500"
                        }`}
                      >
                        Tháng {m}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section: Bảng Giá Vé & Dịch Vụ */}
          {place.prices && place.prices.length > 0 && (
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ticket size={16} color="#F59E0B" />
                  <Text className="text-white font-black text-sm ml-1.5">
                    Bảng Giá Vé & Dịch Vụ
                  </Text>
                </View>
                <Text className="text-slate-400 text-[11px]">Đơn vị: VNĐ</Text>
              </View>

              {place.prices.map((pr) => (
                <View
                  key={pr.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex-row items-center justify-between mb-2"
                >
                  <View className="flex-1 mr-2">
                    <Text className="text-white font-bold text-xs">{pr.label}</Text>
                    <Text className="text-slate-400 text-[11px] mt-0.5">
                      Đối tượng: {pr.audience} · {pr.unit}
                    </Text>
                  </View>
                  <Text className="text-emerald-400 font-black text-sm">
                    {pr.amount === 0 ? "Miễn phí" : `${pr.amount.toLocaleString("vi-VN")}đ`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Section: Giờ Mở Cửa */}
          {place.openingHours && place.openingHours.length > 0 && (
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center mb-3">
                <Clock size={16} color="#818CF8" />
                <Text className="text-white font-black text-sm ml-1.5">Giờ Mở Cửa Hoạt Động</Text>
              </View>

              {place.openingHours.map((oh) => (
                <View
                  key={oh.id}
                  className="flex-row items-center justify-between py-1.5 border-b border-slate-800/60"
                >
                  <Text className="text-slate-300 text-xs font-semibold">
                    {DAY_LABELS[oh.dayOfWeek] || oh.dayOfWeek}
                  </Text>
                  <Text className="text-slate-400 text-xs">
                    {oh.isOpen24Hours
                      ? "Mở cửa 24/24"
                      : oh.isClosed
                      ? "Đóng cửa"
                      : `${oh.openTime || "08:00"} - ${oh.closeTime || "17:30"}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Section: Liên Hệ */}
          {(place.phone || place.websiteUrl) && (
            <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <Text className="text-white font-black text-sm mb-3">Thông Tin Liên Hệ</Text>

              {place.phone && (
                <TouchableOpacity
                  onPress={() => handleCall(place.phone!)}
                  className="flex-row items-center justify-between py-2 border-b border-slate-800/60 mb-1"
                >
                  <View className="flex-row items-center">
                    <Phone size={14} color="#10B981" />
                    <Text className="text-slate-300 text-xs ml-2">Số điện thoại</Text>
                  </View>
                  <Text className="text-emerald-400 font-bold text-xs">{place.phone}</Text>
                </TouchableOpacity>
              )}

              {place.websiteUrl && (
                <TouchableOpacity
                  onPress={() => handleOpenWebsite(place.websiteUrl!)}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center">
                    <Globe size={14} color="#38BDF8" />
                    <Text className="text-slate-300 text-xs ml-2">Trang web chính thức</Text>
                  </View>
                  <ChevronRight size={14} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Section: Đánh Giá & Nhận Xét */}
          <View className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-white font-black text-sm ml-1.5">
                  Đánh Giá Từ Du Khách ({place.reviews?.length || 0})
                </Text>
              </View>
              <Text className="text-emerald-400 text-xs font-bold">
                ⭐ {place.averageRating ? place.averageRating.toFixed(1) : "5.0"} / 5.0
              </Text>
            </View>

            {place.reviews && place.reviews.length > 0 ? (
              place.reviews.map((rev) => (
                <View
                  key={rev.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-2"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-white font-bold text-xs">
                      {rev.author?.fullName || "Du khách"}
                    </Text>
                    <View className="flex-row items-center">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} size={10} color="#F59E0B" fill="#F59E0B" />
                      ))}
                    </View>
                  </View>
                  <Text className="text-slate-300 text-xs leading-relaxed">
                    {rev.content}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-slate-500 text-xs text-center py-2">
                Chưa có đánh giá nào cho địa điểm này.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom CTA Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 p-4 flex-row items-center justify-between backdrop-blur-md">
        <View className="mr-3">
          <Text className="text-slate-400 text-[11px]">Giá vé tham khảo</Text>
          <Text className="text-emerald-400 font-black text-base">
            {minPrice
              ? minPrice.amount === 0
                ? "Miễn phí vé"
                : `Từ ${minPrice.amount.toLocaleString("vi-VN")}đ`
              : "Miễn phí vé vào"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePlanWithPlace}
          className="bg-emerald-500 px-5 py-3 rounded-xl flex-row items-center shadow-lg shadow-emerald-500/25 flex-1 justify-center"
        >
          <Sparkles size={16} color="#020617" />
          <Text className="text-slate-950 font-black text-xs ml-1.5">
            LẬP LỊCH TRÌNH VỚI ĐIỂM NÀY
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
