import { Alert, Platform } from "react-native";

/**
 * Hiển thị thông báo đơn giản, chạy được cả trên web lẫn native.
 */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }

  Alert.alert(title, message);
}

/**
 * Hộp thoại xác nhận trả về Promise<boolean>, chạy được cả trên web lẫn native.
 */
export function confirmAction(
  title: string,
  message: string,
  options: { confirmLabel?: string; destructive?: boolean } = {},
): Promise<boolean> {
  const { confirmLabel = "Đồng ý", destructive = false } = options;

  if (Platform.OS === "web") {
    if (typeof window === "undefined") return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
