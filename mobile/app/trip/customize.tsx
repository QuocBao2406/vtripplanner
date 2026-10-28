import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUp, ArrowDown, Trash2, Plus, Clock, MapPin, Check, X, Tag, DollarSign } from "lucide-react-native";
import Haptics from "../../src/utils/haptics";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/constants/theme";

type EditableActivity = {
  id: string;
  time: string;
  placeName: string;
  category: string;
  fee: number;
};

const INITIAL_ACTIVITIES: EditableActivity[] = [
  { id: "a1", time: "05:00", placeName: "Săn mây Đồi Đa Phú / Đồi chè Cầu Đất", category: "Săn mây", fee: 0 },
  { id: "a2", time: "08:00", placeName: "Ăn sáng Bánh mì xíu mại Hoàng Diệu", category: "Ẩm thực", fee: 40000 },
  { id: "a3", time: "10:00", placeName: "Check-in Khu Du Lịch Thung Lũng Vàng", category: "Tham quan", fee: 70000 },
  { id: "a4", time: "12:30", placeName: "Ăn trưa Lẩu gà lá é Tao Ngộ", category: "Ẩm thực", fee: 150000 },
  { id: "a5", time: "15:00", placeName: "Trải nghiệm Máng trượt Thác Datanla", category: "Trải nghiệm", fee: 180000 },
  { id: "a6", time: "18:30", placeName: "Dạo Chợ Đêm Đà Lạt & Ăn vặt", category: "Ăn vặt", fee: 80000 },
];

export default function CustomizeTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<EditableActivity[]>(INITIAL_ACTIVITIES);

  // New activity modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTime, setNewTime] = useState("16:30");
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newCategory, setNewCategory] = useState("Tham quan");
  const [newFee, setNewFee] = useState("0");

  const moveUp = (index: number) => {
    if (index === 0) return;
    Haptics.selectionAsync();
    const newItems = [...activities];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    setActivities(newItems);
  };

  const moveDown = (index: number) => {
    if (index === activities.length - 1) return;
    Haptics.selectionAsync();
    const newItems = [...activities];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    setActivities(newItems);
  };

  const removeActivity = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddActivity = () => {
    if (!newPlaceName.trim()) {
      Alert.alert("Thiếu tên địa điểm", "Vui lòng nhập tên địa điểm hoặc hoạt động.");
      return;
    }
    const created: EditableActivity = {
      id: "custom-" + Date.now(),
      time: newTime.trim() || "09:00",
      placeName: newPlaceName.trim(),
      category: newCategory,
      fee: parseInt(newFee.replace(/[^0-9]/g, ""), 10) || 0,
    };
    setActivities((prev) => [...prev, created]);
    setIsAddModalOpen(false);
    setNewPlaceName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Thành công", "Đã cập nhật thứ tự và khung giờ chuyến đi!", [
      { text: "Hoàn tất", onPress: () => router.back() },
    ]);
  };

  const topPadding = insets.top > 0 ? insets.top + 8 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 16);

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: topPadding, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
              TÙY CHỈNH LỊCH TRÌNH
            </Text>
            <Text className="text-white font-black text-xl mt-0.5">
              Sắp Xếp & Thêm Địa Điểm
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsAddModalOpen(true)}
            className="bg-emerald-500 px-3.5 py-2 rounded-xl flex-row items-center shadow-md shadow-emerald-500/25"
          >
            <Plus size={16} color="#020617" />
            <Text className="text-slate-950 font-black text-xs ml-1">Thêm điểm</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-slate-400 text-xs mb-4">
          Dùng mũi tên ↑/↓ để sắp xếp thứ tự di chuyển, bấm thùng rác để xóa hoặc thêm điểm dừng chân mới.
        </Text>

        {activities.map((item, index) => (
          <View
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center mb-1">
                <Clock size={13} color="#34D399" />
                <Text className="text-emerald-400 font-bold text-xs ml-1.5">
                  {item.time}
                </Text>
                <Text className="text-slate-600 text-xs mx-1.5">•</Text>
                <View className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                  <Text className="text-slate-300 text-[10px] font-bold">
                    {item.category}
                  </Text>
                </View>
              </View>
              <Text className="text-white font-bold text-sm" numberOfLines={2}>
                {item.placeName}
              </Text>
              <Text className="text-slate-400 text-[11px] mt-1">
                Chi phí vé: {item.fee === 0 ? "Miễn phí" : `${item.fee.toLocaleString("vi-VN")}đ`}
              </Text>
            </View>

            {/* Reorder & Delete Buttons */}
            <View className="flex-row items-center space-x-1.5">
              <TouchableOpacity
                onPress={() => moveUp(index)}
                disabled={index === 0}
                className={`p-2.5 rounded-xl ${
                  index === 0 ? "opacity-20 bg-slate-950" : "bg-slate-800"
                }`}
              >
                <ArrowUp size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => moveDown(index)}
                disabled={index === activities.length - 1}
                className={`p-2.5 rounded-xl ml-1.5 ${
                  index === activities.length - 1 ? "opacity-20 bg-slate-950" : "bg-slate-800"
                }`}
              >
                <ArrowDown size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => removeActivity(item.id)}
                className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/30 ml-1.5"
              >
                <Trash2 size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSave}
          className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center space-x-2 mt-4 shadow-lg shadow-emerald-500/25 mb-8"
        >
          <Check size={18} color="#020617" />
          <Text className="text-slate-950 font-black text-sm ml-1.5">
            LƯU LỊCH TRÌNH ĐÃ CHỈNH SỬA
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Add Activity */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View className="flex-1 bg-black/85 justify-end">
          <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-black text-lg">
                Thêm Điểm Dừng Chân
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                className="bg-slate-800 p-2 rounded-full"
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View className="mb-3">
              <Text className="text-slate-300 text-xs font-bold mb-1.5">
                TÊN ĐỊA ĐIỂM / HOẠT ĐỘNG
              </Text>
              <TextInput
                value={newPlaceName}
                onChangeText={setNewPlaceName}
                placeholder="VD: Cà phê ngắm hoàng hôn, Vườn dâu..."
                placeholderTextColor="#64748B"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white text-sm"
              />
            </View>

            <View className="flex-row space-x-3 mb-3">
              <View className="flex-1">
                <Text className="text-slate-300 text-xs font-bold mb-1.5">
                  KHUNG GIỜ
                </Text>
                <TextInput
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="16:30"
                  placeholderTextColor="#64748B"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white text-sm"
                />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-slate-300 text-xs font-bold mb-1.5">
                  CHI PHÍ VÉ (VND)
                </Text>
                <TextInput
                  value={newFee}
                  onChangeText={setNewFee}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748B"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-emerald-400 font-bold text-sm"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-300 text-xs font-bold mb-2">
                LOẠI HOẠT ĐỘNG
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {["Tham quan", "Ẩm thực", "Săn mây", "Cafe & Chill", "Trải nghiệm"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      newCategory === cat
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        newCategory === cat ? "text-slate-950 font-black" : "text-slate-300"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAddActivity}
              className="w-full bg-emerald-500 py-3.5 rounded-xl items-center justify-center shadow-lg shadow-emerald-500/25"
            >
              <Text className="text-slate-950 font-black text-sm">THÊM VÀO LỊCH TRÌNH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
