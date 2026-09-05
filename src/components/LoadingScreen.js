import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, Animated, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, shared } from '../styles/styles';

export default function LoadingScreen({ label = 'Loading' }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView
      edges={['top']}
      style={[shared.screen, styles.centered]}
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
    >
      {/* <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
        <Text style={[typography.caption, styles.label]}>{label}</Text>
      </Animated.View> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 140, height: 70, marginBottom: spacing.lg },
  spinner: { marginBottom: spacing.sm },
  label: { textAlign: 'center' },
});