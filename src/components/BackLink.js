import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../styles/styles';

export default function BackLink({ label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
    >
      <Text style={styles.backArrow}>←</Text>
      <Text style={[typography.normal, styles.backLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, alignSelf: 'flex-start' },
  backArrow: { fontSize: 20, color: colors.primary, marginRight: 4 },
  backLabel: { color: colors.primary, fontWeight: '600' },
});