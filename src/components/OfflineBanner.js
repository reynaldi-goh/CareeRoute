import { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../styles/styles';

// Mount this once near the root of the app (above the navigator), not per-screen —
// it needs to persist across every tab so it can warn regardless of where the user is.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected: device has a network interface (e.g. WiFi) up
      // isInternetReachable: that interface can actually reach the internet — this is
      // the one that matters for API calls (Supabase/Groq/GNews); isConnected alone
      // can be true on a WiFi network with no real internet access.
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: offline ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [offline]);

  // Fully unmount while online — zero height, zero color, nothing left behind.
  // (Animating height to 0 while also needing paddingTop for the notch was the bug:
  // the padding couldn't fit inside a 0px box, so the bar never actually collapsed.)
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
  // Background sits on the SafeAreaView itself so the red bleeds continuously
  // behind the notch/camera instead of stopping short of it.
  safeArea: { backgroundColor: '#DC2626' },
  banner: { height: 28, alignItems: 'center', justifyContent: 'center'},
  text: { color: colors.white, fontSize: 12, fontWeight: '600' },
});