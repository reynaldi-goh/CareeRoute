import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

// Shows a native confirm dialog before running a destructive action.
// Usage: confirmAction({ title, message, confirmLabel, onConfirm })
export function confirmAction({ title, message, confirmLabel = 'Confirm', onConfirm }) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}