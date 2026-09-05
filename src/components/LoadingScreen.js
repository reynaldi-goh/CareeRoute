import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shared } from '../styles/styles';

export default function LoadingScreen({ label = 'Loading' }) {
  return (
    <SafeAreaView
      edges={['top']}
      style={[shared.screen, styles.centered]}
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
    >
      <ActivityIndicator color={colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ centered: { flex: 1, alignItems: 'center', justifyContent: 'center' } });