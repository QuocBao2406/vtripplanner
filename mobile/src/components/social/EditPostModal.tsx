import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";

import { api } from "../../services/api";
import { showMessage } from "../../utils/dialog";
import Haptics from "../../utils/haptics";

const MAX_CAPTION_LENGTH = 2000;

type EditPostModalProps = {
  visible: boolean;
  postId: string | null;
  initialCaption: string;
  onClose: () => void;
  onSaved: (postId: string, caption: string) => void;
};

export function EditPostModal({ visible, postId, initialCaption, onClose, onSaved }: EditPostModalProps) {
  const [caption, setCaption] = useState(initialCaption);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) setCaption(initialCaption);
  }, [visible, initialCaption]);

  const trimmed = caption.trim();
  const isUnchanged = trimmed === initialCaption.trim();
  const canSave = Boolean(postId) && trimmed.length > 0 && !isUnchanged && !isSaving;

  const handleSave = async () => {
    if (!postId || !canSave) return;
    setIsSaving(true);
    try {
      const result = await api.updatePostCaption(postId, trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(postId, result.caption);
      onClose();
    } catch (error: any) {
      showMessage("Không thể lưu", error?.message || "Vui lòng thử lại sau.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,6,23,0.7)" }}
      >
        <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-4 pb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-black text-base">Chỉnh sửa bài viết</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Đóng"
              className="w-9 h-9 rounded-full bg-slate-800 items-center justify-center"
            >
              <X size={18} color="#E2E8F0" />
            </TouchableOpacity>
          </View>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={MAX_CAPTION_LENGTH}
            placeholder="Chia sẻ cảm nhận về chuyến đi của bạn..."
            placeholderTextColor="#64748B"
            textAlignVertical="top"
            style={{
              minHeight: 160,
              maxHeight: 320,
              color: "#F8FAFC",
              fontSize: 14,
              lineHeight: 20,
              backgroundColor: "#020617",
              borderWidth: 1,
              borderColor: "#1E293B",
              borderRadius: 16,
              padding: 12,
            }}
          />

          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-slate-500 text-[11px]">
              Chỉ sửa được nội dung chữ. Muốn đổi ảnh, hãy xóa và đăng bài mới.
            </Text>
            <Text className="text-slate-500 text-[11px] ml-2">
              {caption.length}/{MAX_CAPTION_LENGTH}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            className={`mt-4 py-3 rounded-2xl items-center ${canSave ? "bg-emerald-500" : "bg-slate-800"}`}
          >
            {isSaving ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <Text className={`font-black text-sm ${canSave ? "text-slate-950" : "text-slate-500"}`}>
                Lưu thay đổi
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
