import { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../styles/styles';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // watch connectivity and derive a single offline flag from it
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected: device has a network interface (e.g. WiFi) up
      // isInternetReachable: that interface can actually reach the internet
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsubscribe();
  }, []);

  // fade the banner in/out whenever offline state changes
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: offline ? 1 : 0, duration: 400, useNativeDriver: true }).start();
  }, [offline]);

  // (animating height to 0 while also needing paddingTop for the notch was the bug:
  // the padding couldn't fit inside a 0px box, so the bar never actually collapsed)
  if (!offline) return null;

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
        <Text style={styles.text}>No internet connection</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.danger },
  banner: { height: 28, alignItems: 'center', justifyContent: 'center'},
  text: { color: colors.white, fontSize: 12, fontWeight: '600' },
});