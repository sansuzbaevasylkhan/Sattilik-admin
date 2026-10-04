import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { requestNotificationPermission, registerForPushNotificationsAsync, savePushToken } from '@/lib/notifications';
import { NetworkProvider } from '@/hooks/useNetwork';
import { getUser } from '@/store/userStore';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const user = getUser();
        if (!user.id) return;

        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushToken(user.id, token);
        }
      } catch (e) {
        console.error('Notification setup error:', e);
      }
    };

    setupNotifications();
    requestNotificationPermission();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GlobalErrorBoundary>
      <NetworkProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="home" />
          <Stack.Screen name="register" />
          <Stack.Screen name="order" />
          <Stack.Screen name="driver-order" />
          <Stack.Screen name="rate-driver" />
          <Stack.Screen name="menu/profile" />
          <Stack.Screen name="menu/edit-profile" />


          <Stack.Screen name="menu/payment" />
          <Stack.Screen name="menu/history" />
          <Stack.Screen name="menu/add-card" />
          <Stack.Screen name="menu/settings" />
          <Stack.Screen name="menu/guide" />
          <Stack.Screen name="menu/guide-chat" />
          <Stack.Screen name="menu/pay-driver" />
          <Stack.Screen name="menu/driver-earnings" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </NetworkProvider>
    </GlobalErrorBoundary>
  );
}

