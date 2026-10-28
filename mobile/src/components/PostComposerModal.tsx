import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Image as ImageIcon,
  MapPin,
  Globe,
  Sparkles,
  Plus,
  ShieldCheck,
  Compass,
} from "lucide-react-native";
import Haptics from "../utils/haptics";
import { api } from "../services/api";
import { useAuth } from "../context/auth";
import { resolveMediaUrl } from "../constants/theme";

interface PostComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export type CheckinPlaceItem = {
  id: string;
  name: string;
  provinceName: string;
};

const SAMPLE_TRAVEL_PHOTOS = [
  { uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80", label: "Đà Lạt sương mù" },
  { uri: "https://images.unsplash.com/photo-1528127269322-539801943592?w=1000&auto=format&fit=crop&q=80", label: "Đèo Hà Giang" },
  { uri: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1000&auto=format&fit=crop&q=80", label: "Tràng An Ninh Bình" },
  { uri: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80", label: "Biển Phú Quốc" },
  { uri: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1000&auto=format&fit=crop&q=80", label: "Dinh Độc Lập" },
];

export const POPULAR_CHECKIN_PLACES: CheckinPlaceItem[] = [
  { id: "pl-ho-xuan-huong", name: "Hồ Xuân Hương", provinceName: "Lâm Đồng" },
  { id: "pl-ga-da-lat", name: "Ga Xe Lửa Cổ Đà Lạt", provinceName: "Lâm Đồng" },
  { id: "pl-dinh-doc-lap", name: "Dinh Độc Lập", provinceName: "TP. Hồ Chí Minh" },
  { id: "pl-cho-ben-thanh", name: "Chợ Bến Thành", provinceName: "TP. Hồ Chí Minh" },
  { id: "pl-nha-tho-duc-ba", name: "Nhà thờ Đức Bà Sài Gòn", provinceName: "TP. Hồ Chí Minh" },
  { id: "pl-trang-an-ninh-binh", name: "Quần Thể Danh Thắng Tràng An", provinceName: "Ninh Bình" },
];

export function PostComposerModal({
  visible,
  onClose,
  onPostCreated,
}: PostComposerModalProps) {
  const { user, profile } = useAuth();
  const [postType, setPostType] = useState<"USER_TRIP" | "GUIDE">("USER_TRIP");
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<CheckinPlaceItem | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const resetForm = () => {
    setPostType("USER_TRIP");
    setHeadline("");
    setCaption("");
    setSelectedImages([]);
    setSelectedPlace(null);
    setIsPosting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickImageFromDevice = async () => {
    Haptics.selectionAsync();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        setSelectedImages((prev) => [...prev, ...newUris].slice(0, 10));
      }
    } catch (error) {
      console.warn("Image picker error:", error);
    }
  };

  const addSampleImage = (uri: string) => {
    Haptics.selectionAsync();
    if (!selectedImages.includes(uri)) {
      setSelectedImages((prev) => [...prev, uri].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    Haptics.selectionAsync();
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPost = async () => {
    if (!caption.trim()) {
      const msg = "Vui lòng nhập nội dung chia sẻ về chuyến đi hoặc địa điểm của bạn.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Thông báo", msg);
      return;
    }

    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const formData = new FormData();
      formData.append("caption", caption.trim());
      if (headline.trim()) {
        formData.append("headline", headline.trim());
      }
      formData.append("type", postType === "GUIDE" ? "SEASONAL_GUIDE" : "USER_TRIP");
      if (selectedPlace) {
        formData.append("placeId", selectedPlace.id);
        formData.append("placeName", selectedPlace.name);
      }

      // Process attached images
      for (let i = 0; i < selectedImages.length; i++) {
        const uri = selectedImages[i];
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          try {
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append("media", blob, `travel-image-${i}.jpg`);
          } catch (e) {
            console.warn("Failed to fetch remote image:", e);
          }
        } else if (Platform.OS === "web") {
          const res = await fetch(uri);
          const blob = await res.blob();
          formData.append("media", blob, `travel-image-${i}.jpg`);
        } else {
          const filename = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append("media", {
            uri,
            name: filename,
            type,
          } as any);
        }
      }

      await api.createPost(formData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (Platform.OS === "web") {
        window.alert(
          postType === "GUIDE"
            ? "🎉 Đã đăng bài Giới thiệu du lịch thành công lên Bảng tin!"
            : "🎉 Đã đăng bài Chia sẻ trải nghiệm thành công lên Bảng tin!"
        );
      } else {
        Alert.alert(
          "Thành công",
          postType === "GUIDE"
            ? "Đã đăng bài Giới thiệu du lịch lên Bảng tin."
            : "Đã đăng bài Chia sẻ trải nghiệm của bạn lên Bảng tin."
        );
      }

      resetForm();
      onPostCreated();
      onClose();
    } catch (error: any) {
      const msg = error.message || "Không thể đăng bài viết.";
      if (Platform.OS === "web") window.alert("Lỗi: " + msg);
      else Alert.alert("Lỗi đăng bài", msg);
    } finally {
      setIsPosting(false);
    }
  };

  const displayName =
    profile?.displayName ||
    profile?.fullName ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Bạn";

  const avatarUrl = resolveMediaUrl(profile?.avatarUrl || user?.user_metadata?.avatar_url);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/70 justify-end">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[92%] flex-1 mt-14 overflow-hidden"
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-800">
            <TouchableOpacity onPress={handleClose} className="p-1 rounded-full active:bg-slate-800">
              <X size={22} color="#94A3B8" />
            </TouchableOpacity>

            <Text className="text-white font-bold text-base">Tạo bài viết mới</Text>

            <TouchableOpacity
              onPress={handleSubmitPost}
              disabled={isPosting || !caption.trim()}
              className={`px-4 py-1.5 rounded-full ${
                !caption.trim() || isPosting ? "bg-slate-800" : "bg-emerald-500 active:bg-emerald-600"
              }`}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="#020617" />
              ) : (
                <Text
                  className={`font-black text-xs ${
                    !caption.trim() ? "text-slate-500" : "text-slate-950"
                  }`}
                >
                  ĐĂNG BÀI
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-4 py-3"
            contentContainerStyle={{ paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Post Type Selector: Admin Giới thiệu du lịch vs User Chia sẻ trải nghiệm */}
            <View className="bg-slate-950 border border-slate-800 p-1.5 rounded-2xl flex-row mb-3.5">
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setPostType("USER_TRIP");
                }}
                className={`flex-1 py-2 rounded-xl flex-row items-center justify-center space-x-1 ${
                  postType === "USER_TRIP" ? "bg-sky-500/20 border border-sky-500" : ""
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    postType === "USER_TRIP" ? "text-sky-300 font-black" : "text-slate-400"
                  }`}
                >
                  🎒 Du khách chia sẻ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setPostType("GUIDE");
                }}
                className={`flex-1 py-2 rounded-xl flex-row items-center justify-center space-x-1 ${
                  postType === "GUIDE" ? "bg-amber-500/20 border border-amber-500" : ""
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    postType === "GUIDE" ? "text-amber-400 font-black" : "text-slate-400"
                  }`}
                >
                  🌟 Giới thiệu du lịch (Admin)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Author Info Bar */}
            <View className="flex-row items-center mb-3">
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: postType === "GUIDE" ? "#78350F" : "#064E3B",
                  borderWidth: 1.5,
                  borderColor: postType === "GUIDE" ? "#F59E0B" : "#10B981",
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                  <Text className="text-white font-black text-base">
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-white font-black text-sm mr-1.5">{displayName}</Text>
                  {postType === "GUIDE" ? (
                    <View className="bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full flex-row items-center">
                      <ShieldCheck size={11} color="#F59E0B" />
                      <Text className="text-amber-400 text-[10px] font-bold ml-1">Ban biên tập</Text>
                    </View>
                  ) : (
                    <View className="bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full flex-row items-center">
                      <Text className="text-sky-300 text-[10px] font-medium">Thành viên</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center mt-1">
                  <View className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md flex-row items-center mr-2">
                    <Globe size={11} color="#34D399" />
                    <Text className="text-emerald-400 text-[10px] font-bold ml-1">Công khai 🌍</Text>
                  </View>
                  {selectedPlace && (
                    <View className="bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md flex-row items-center">
                      <MapPin size={10} color="#34D399" />
                      <Text className="text-emerald-300 text-[10px] font-semibold ml-1" numberOfLines={1}>
                        {selectedPlace.name} ({selectedPlace.provinceName})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Headline Input (Optional) */}
            <TextInput
              value={headline}
              onChangeText={setHeadline}
              placeholder={
                postType === "GUIDE"
                  ? "Tiêu đề giới thiệu địa điểm (VD: Cẩm nang du lịch Tràng An mùa đẹp nhất...)"
                  : "Tiêu đề trải nghiệm (VD: Phượt xe máy Đà Lạt 3N2Đ cùng hội bạn...)"
              }
              placeholderTextColor="#475569"
              className="text-white font-black text-base mb-2 px-1"
            />

            {/* Caption Main Input */}
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={
                postType === "GUIDE"
                  ? "Giới thiệu chi tiết về địa điểm này: vẻ đẹp, lịch sử, văn hóa, chi phí vé tham quan, thời gian mở cửa và kinh nghiệm đi lại..."
                  : "Chia sẻ trải nghiệm thực tế chuyến đi của bạn: đường đi, ăn uống, địa điểm check-in và những lưu ý bổ ích..."
              }
              placeholderTextColor="#64748B"
              multiline
              className="text-white text-sm font-medium leading-6 min-h-[110px] mb-3 px-1"
              textAlignVertical="top"
            />

            {/* Selected Images Carousel */}
            {selectedImages.length > 0 && (
              <View className="mb-4">
                <Text className="text-slate-400 text-xs font-bold mb-2">
                  Ảnh đính kèm ({selectedImages.length}/10):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {selectedImages.map((uri, index) => (
                    <View
                      key={index}
                      style={{ width: 120, height: 120 }}
                      className="mr-2.5 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative"
                    >
                      <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      <TouchableOpacity
                        onPress={() => removeImage(index)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 items-center justify-center border border-white/20"
                      >
                        <X size={13} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {selectedImages.length < 10 && (
                    <TouchableOpacity
                      onPress={pickImageFromDevice}
                      style={{ width: 120, height: 120 }}
                      className="rounded-2xl border-2 border-dashed border-slate-700 items-center justify-center bg-slate-950/50"
                    >
                      <Plus size={24} color="#64748B" />
                      <Text className="text-slate-400 text-[11px] font-bold mt-1">Thêm ảnh</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Quick Sample Travel Photos */}
            <View className="bg-slate-950 border border-slate-800 rounded-2xl p-3 mb-4">
              <Text className="text-slate-300 font-bold text-xs mb-2">
                ✨ Hoặc chọn nhanh ảnh phong cảnh mẫu đẹp:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {SAMPLE_TRAVEL_PHOTOS.map((item, i) => {
                  const isAdded = selectedImages.includes(item.uri);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => (isAdded ? removeImage(selectedImages.indexOf(item.uri)) : addSampleImage(item.uri))}
                      className="mr-2 items-center"
                    >
                      <View
                        style={{ width: 70, height: 70 }}
                        className={`rounded-xl overflow-hidden border-2 ${
                          isAdded ? "border-emerald-500" : "border-slate-800"
                        }`}
                      >
                        <Image source={{ uri: item.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      </View>
                      <Text className="text-slate-400 text-[10px] mt-1 font-medium" numberOfLines={1}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Place Check-in Section: Link with real Places for "Chi tiết" button */}
            <View className="bg-slate-950 border border-slate-800 rounded-2xl p-3 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-slate-300 font-bold text-xs">
                  📍 Gắn thẻ địa điểm du lịch (Sẽ có nút "Chi tiết"):
                </Text>
                {selectedPlace && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedPlace(null);
                    }}
                  >
                    <Text className="text-red-400 text-[11px] font-semibold">Bỏ chọn</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row flex-wrap gap-1.5">
                {POPULAR_CHECKIN_PLACES.map((place) => {
                  const isSelected = selectedPlace?.id === place.id;
                  return (
                    <TouchableOpacity
                      key={place.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedPlace(isSelected ? null : place);
                      }}
                      className={`px-3 py-1.5 rounded-full border flex-row items-center ${
                        isSelected
                          ? "bg-emerald-500/20 border-emerald-500"
                          : "bg-slate-900 border-slate-800 active:bg-slate-800"
                      }`}
                    >
                      <MapPin size={11} color={isSelected ? "#10B981" : "#64748B"} />
                      <Text
                        className={`text-[11px] font-semibold ml-1 ${
                          isSelected ? "text-emerald-400 font-bold" : "text-slate-400"
                        }`}
                      >
                        {place.name} ({place.provinceName})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bottom Actions Bar */}
            <View className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 flex-row items-center justify-around">
              <TouchableOpacity
                onPress={pickImageFromDevice}
                className="flex-row items-center py-1.5 px-3 rounded-xl bg-slate-900 active:bg-slate-800"
              >
                <ImageIcon size={18} color="#10B981" />
                <Text className="text-white text-xs font-bold ml-1.5">Chọn ảnh từ máy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setPostType(postType === "GUIDE" ? "USER_TRIP" : "GUIDE");
                }}
                className="flex-row items-center py-1.5 px-3 rounded-xl bg-slate-900 active:bg-slate-800"
              >
                <Sparkles size={18} color="#F59E0B" />
                <Text className="text-white text-xs font-bold ml-1.5">
                  {postType === "GUIDE" ? "Chuyển sang User" : "Chế độ Admin"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
