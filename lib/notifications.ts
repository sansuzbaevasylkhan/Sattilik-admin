import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function registerForPushNotificationsAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (e) {
    console.error('Error registering for push notifications:', e);
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  // This should ideally be a Supabase call
  console.log(`Saving token ${token} for user ${userId}`);
}

export async function notifyLocal(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Notification-сыз да ағын жалғаса береді — сыни емес.
  }
}
