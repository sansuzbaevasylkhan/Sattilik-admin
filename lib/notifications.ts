import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const ANDROID_CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Sattilik Taxi',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FFD700',
    sound: 'default',
  });
}

function getProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    await ensureAndroidChannel();
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    await ensureAndroidChannel();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = getProjectId();
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined))
      .data;
    return token || null;
  } catch (e) {
    console.error('Error registering for push notifications:', e);
    return null;
  }
}

/**
 * Expo push токенін сервердегі push_tokens кестесіне жазады.
 * Жазу service_role Edge Function арқылы жүреді — RLS әлсіретілмейді.
 */
export async function savePushToken(phone: string, token: string): Promise<boolean> {
  if (!phone || !token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/save-push-token`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ phone, token, device_type: Platform.OS }),
    });
    return res.ok;
  } catch (e) {
    console.error('Error saving push token:', e);
    return false;
  }
}

/** Токен құрылғыда жаңарғанда қайта сақтау үшін. */
export function addPushTokenRefreshListener(onToken: (token: string) => void) {
  return Notifications.addPushTokenListener(async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) onToken(token);
  });
}

/** Хабарламаны басқанда оның data өрісін қайтарады. */
export function addNotificationResponseListener(onResponse: (data: Record<string, any>) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse((response.notification.request.content.data ?? {}) as Record<string, any>);
  });
}

/** Қосымша жабық тұрғанда басылған хабарламаны қайтарады. */
export async function getLastNotificationData(): Promise<Record<string, any> | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return (response?.notification.request.content.data ?? null) as Record<string, any> | null;
  } catch {
    return null;
  }
}

/** Серверге push оқиғасын жібереді (send-push-notification Edge Function). */
export async function invokePushEvent(
  event: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ event, ...payload }),
    });
  } catch {
    // Push — қосымша функция: сәтсіздік негізгі ағынды тоқтатпайды.
  }
}

export async function notifyLocal(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null,
    });
  } catch {
    // Notification-сыз да ағын жалғаса береді — сыни емес.
  }
}
