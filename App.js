import { useEffect, useState } from 'react';
import { Linking, ActivityIndicator, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';
import AuthStack from './src/navigation/AuthNavigator';
import { CareerProvider } from './src/context/CareerContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { supabase } from './src/API/supabaseClient';
import OfflineBanner from './src/components/OfflineBanner';
import LoadingScreen from './src/components/LoadingScreen';

const RootStack = createNativeStackNavigator();

// lets us navigate from outside a screen component 
export const navigationRef = createNavigationContainerRef();

// owns the session state and swaps between the auth stack and the main tabs
export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // keep local session state in sync with Supabase auth
  useEffect(() => {
    // check once on launch whether a session already exists (e.g. app reopened while logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    // keep session in sync with every future auth event: login, logout, token refresh, signup
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // handle email confirmation links opening the app 
  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      if (!url) return;

      // Supabase's confirm link redirects here with a ?code=... param.
      // exchange it so the confirmation actually completes on the client side too.
      if (url.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.log('exchangeCodeForSession error:', error.message);
          // exchange failed, send them to Login to sign in manually instead
          if (navigationRef.isReady()) {
            navigationRef.navigate('Auth', { screen: 'Login' });
          }
        }
        // on success, the onAuthStateChange listener above picks up the new session
        // and the RootStack automatically swaps to MainTabs
      }
    };

    // cold start: app was closed, opened directly via the email link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // warm start: app was already running in the background
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  // avoid a flash of the login screen while we're still checking for an existing session
  if (checkingSession) {
    return (
      <SafeAreaProvider>
        <OfflineBanner />
        <LoadingScreen label="Loading" />
      </SafeAreaProvider>
    );
  }

  // CareerProvider/ProfileProvider wrap everything so both stacks (auth included) can read them;
  // RootStack itself just picks auth vs. main tabs based on whether a session exists
  return (
    <CareerProvider>
      <ProfileProvider>
        <SafeAreaProvider>
          <OfflineBanner />
          <NavigationContainer ref={navigationRef}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {session ? (
                <RootStack.Screen name="MainTabs" component={TabNavigator} />
              ) : (
                <RootStack.Screen name="Auth" component={AuthStack} />
              )}
            </RootStack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </ProfileProvider>
    </CareerProvider>
  );
}