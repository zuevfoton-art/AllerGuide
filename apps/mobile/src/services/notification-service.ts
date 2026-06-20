import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting, setSetting } from '@/src/services/settings-service';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const REMINDER_ID_KEY = 'diaryReminderId';

function isNotificationGranted(
  permissions: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): boolean {
  const legacy = permissions as { granted?: boolean; status?: string };
  if (typeof legacy.granted === 'boolean') return legacy.granted;
  return legacy.status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const existing = await Notifications.getPermissionsAsync();
  if (isNotificationGranted(existing)) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return isNotificationGranted(requested);
}

export function isDiaryReminderEnabled(): boolean {
  return getSetting('diaryReminderEnabled') === 'true';
}

export function setDiaryReminderEnabled(enabled: boolean) {
  setSetting('diaryReminderEnabled', enabled ? 'true' : 'false');
}

export async function scheduleDiaryReminder(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelDiaryReminder();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'AllerGuide',
      body: 'Не забудьте записать самочувствие в дневник',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });

  setSetting(REMINDER_ID_KEY, id);
  setDiaryReminderEnabled(true);
  return true;
}

export async function cancelDiaryReminder() {
  if (Platform.OS === 'web') return;

  const existing = getSetting(REMINDER_ID_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
    setSetting(REMINDER_ID_KEY, '');
  }
  setDiaryReminderEnabled(false);
}

export async function syncDiaryReminder(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    await cancelDiaryReminder();
    return true;
  }
  return scheduleDiaryReminder();
}
