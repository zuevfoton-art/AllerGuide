import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import {
  DEFAULT_DIARY_REMINDER_HOUR,
  DEFAULT_DIARY_REMINDER_MINUTE,
  DIARY_REMINDER_HOUR_KEY,
  DIARY_REMINDER_MINUTE_KEY,
  clampReminderHour,
  clampReminderMinute,
  parseReminderHour,
  parseReminderMinute,
  type ReminderNotificationContent,
} from '@allerguide/core';
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
const REMINDER_ENABLED_KEY = 'diaryReminderEnabled';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'web-unavailable';

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

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'web-unavailable';

  const permissions = await Notifications.getPermissionsAsync();
  if (isNotificationGranted(permissions)) return 'granted';

  const status = (permissions as { status?: string }).status;
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export function openNotificationSettings(): void {
  if (Platform.OS === 'web') return;
  void Linking.openSettings();
}

export function isDiaryReminderEnabled(): boolean {
  return getSetting(REMINDER_ENABLED_KEY) === 'true';
}

export function setDiaryReminderEnabled(enabled: boolean) {
  setSetting(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function getDiaryReminderHour(): number {
  return parseReminderHour(getSetting(DIARY_REMINDER_HOUR_KEY), DEFAULT_DIARY_REMINDER_HOUR);
}

export function getDiaryReminderMinute(): number {
  return parseReminderMinute(getSetting(DIARY_REMINDER_MINUTE_KEY), DEFAULT_DIARY_REMINDER_MINUTE);
}

export function setDiaryReminderTime(hour: number, minute: number) {
  setSetting(DIARY_REMINDER_HOUR_KEY, String(clampReminderHour(hour)));
  setSetting(DIARY_REMINDER_MINUTE_KEY, String(clampReminderMinute(minute)));
}

async function cancelDiaryReminderSchedule() {
  if (Platform.OS === 'web') return;

  const existing = getSetting(REMINDER_ID_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
    setSetting(REMINDER_ID_KEY, '');
  }
}

export async function cancelDiaryReminder() {
  await cancelDiaryReminderSchedule();
  setDiaryReminderEnabled(false);
}

export async function scheduleDiaryReminder(content: ReminderNotificationContent): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelDiaryReminderSchedule();

  const hour = getDiaryReminderHour();
  const minute = getDiaryReminderMinute();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { type: 'diary' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  setSetting(REMINDER_ID_KEY, id);
  setDiaryReminderEnabled(true);
  return true;
}

export async function syncDiaryReminder(
  enabled: boolean,
  content: ReminderNotificationContent,
): Promise<boolean> {
  if (!enabled) {
    await cancelDiaryReminder();
    return true;
  }
  return scheduleDiaryReminder(content);
}

export async function rescheduleDiaryReminderIfEnabled(content: ReminderNotificationContent): Promise<void> {
  if (Platform.OS === 'web' || !isDiaryReminderEnabled()) return;

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;

  await scheduleDiaryReminder(content);
}

export async function sendDiaryReminderPreview(content: ReminderNotificationContent): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { type: 'diary' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });

  return true;
}
