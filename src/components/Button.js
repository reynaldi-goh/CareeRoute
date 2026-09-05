import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, shared } from '../styles/styles';

export default function Button({ label, onPress, loading, disabled, variant = 'primary' }) {
  const isDanger = variant === 'danger';
  const isDisabled = disabled || loading;

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
        <ActivityIndicator color={isDanger ? colors.white : colors.white} />
      ) : (
        <Text style={isDanger ? shared.dangerButtonText : shared.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}