import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, shared } from '../styles/styles';

// shared button used across the app — handles haptics, loading state, and the primary/danger variants
export default function Button({ label, onPress, loading, disabled, variant = 'primary' }) {
  const isDanger = variant === 'danger';
  const isDisabled = disabled || loading;

  // fire a stronger haptic for destructive actions, then run the actual handler
  const handlePress = () => {
    Haptics.impactAsync(
      isDanger ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    onPress();
  };

  return (
    <TouchableOpacity
      style={[isDanger ? shared.dangerButton : shared.primaryButton, isDisabled && shared.disabledButton]}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
    >
      {loading ? (
        // swap the label for a spinner while an async action is in flight
        <ActivityIndicator color={isDanger ? colors.white : colors.white} />
      ) : (
        <Text style={isDanger ? shared.dangerButtonText : shared.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}