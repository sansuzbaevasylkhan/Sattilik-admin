import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import {
  addNotificationResponseListener,
  addPushTokenRefreshListener,
  getLastNotificationData,
  registerForPushNotificationsAsync,
  savePushToken,
} from '@/lib/notifications';
import { NetworkProvider } from '@/hooks/useNetwork';
import { getUser, subscribeUser } from '@/store/userStore';
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

  const syncedPhoneRef = useRef('');

  useEffect(() => {
    let cancelled = false;

    const syncPushToken = async () => {
      const user = getUser();
      if (!user.phone || syncedPhoneRef.current === user.phone) return;
      syncedPhoneRef.current = user.phone;

      try {
        const token = await registerForPushNotificationsAsync();
        if (token && !cancelled) {
          await savePushToken(user.phone, token);
        }
      } catch (e) {
        console.error('Notification setup error:', e);
      }
    };

    syncPushToken();

    const unsubscribeUser = subscribeUser(syncPushToken);
    const tokenSubscription = addPushTokenRefreshListener((token) => {
      const user = getUser();
      if (user.phone) savePushToken(user.phone, token);
    });

    return () => {
      cancelled = true;
      unsubscribeUser();
      tokenSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const handleNotification = (data: Record<string, any>) => {
      if (!data) return;
      const orderId = data.orderId ?? data.order_id;
      const type = data.type;
      if (!orderId && !type) return;
      const role = getUser().role;
      router.push(role === 'driver' ? '/driver-order' : '/order');
    };

    const subscription = addNotificationResponseListener(handleNotification);
    getLastNotificationData().then((data) => {
      if (data) handleNotification(data);
    });

    return () => subscription.remove();
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
        <StatusBar style="dark" />
      </NetworkProvider>
    </GlobalErrorBoundary>
  );
}

