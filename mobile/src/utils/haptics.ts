import { Platform } from "react-native";
import * as ExpoHaptics from "expo-haptics";

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export const impactAsync = async (style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Medium) => {
  if (Platform.OS === "web") return;
  try {
    await ExpoHaptics.impactAsync(style);
  } catch {
    // Gracefully ignore on unsupported devices
  }
};

export const selectionAsync = async () => {
  if (Platform.OS === "web") return;
  try {
    await ExpoHaptics.selectionAsync();
  } catch {
    // Gracefully ignore
  }
};

export const notificationAsync = async (type: ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType.Success) => {
  if (Platform.OS === "web") return;
  try {
    await ExpoHaptics.notificationAsync(type);
  } catch {
    // Gracefully ignore
  }
};

const SafeHaptics = {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  selectionAsync,
  notificationAsync,
};

export default SafeHaptics;
