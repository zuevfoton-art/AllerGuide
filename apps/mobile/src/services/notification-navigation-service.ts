import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import type { NotificationPayload } from '@/src/services/notification-service';

function navigateFromNotification(data: NotificationPayload | undefined) {
  if (!data?.type) return;

  switch (data.type) {
    case 'diary':
      router.push('/(tabs)/diary');
      return;
    case 'asit':
      router.push('/asit-course' as any);
      return;
    case 'act':
      router.push({
        pathname: '/(tabs)/diary',
        params: { openScale: data.scaleId ?? 'act', profileId: data.profileId ? String(data.profileId) : undefined },
      } as any);
      return;
    case 'doctor-visit':
      router.push('/(tabs)/diary');
      return;
    case 'epinephrine-expiry':
      router.push('/(tabs)/sos');
      return;
    default:
      return;
  }
}

export function registerNotificationNavigation(): () => void {
  if (Platform.OS === 'web') return () => {};

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    navigateFromNotification(response.notification.request.content.data as NotificationPayload);
  });

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateFromNotification(response.notification.request.content.data as NotificationPayload);
  });

  return () => subscription.remove();
}
