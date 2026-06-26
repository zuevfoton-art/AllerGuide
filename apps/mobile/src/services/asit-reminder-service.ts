import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  isAsitReminderConfigured,
  type AsitCourse,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { requestNotificationPermission } from '@/src/services/notification-service';

function reminderIdKey(profileId: number) {
  return `asitReminderId:${profileId}`;
}

function isNotificationGranted(
  permissions: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): boolean {
  const legacy = permissions as { granted?: boolean; status?: string };
  if (typeof legacy.granted === 'boolean') return legacy.granted;
  return legacy.status === 'granted';
}

export async function cancelAsitReminder(profileId: number) {
  if (Platform.OS === 'web') return;

  const existing = getSetting(reminderIdKey(profileId));
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
    setSetting(reminderIdKey(profileId), '');
  }
}

export async function scheduleAsitReminder(
  profileId: number,
  course: AsitCourse,
  content: { title: string; body: string },
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!isAsitReminderConfigured(course)) {
    await cancelAsitReminder(profileId);
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelAsitReminder(profileId);

  const hour = course.reminderHour ?? 8;
  const minute = course.reminderMinute ?? 0;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { type: 'asit', profileId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  setSetting(reminderIdKey(profileId), id);
  return true;
}

export async function syncAsitReminder(
  profileId: number,
  course: AsitCourse | null,
  content: { title: string; body: string },
): Promise<boolean> {
  if (!course || !isAsitReminderConfigured(course)) {
    await cancelAsitReminder(profileId);
    return true;
  }
  return scheduleAsitReminder(profileId, course, content);
}

export function isAsitReminderScheduled(profileId: number): boolean {
  return Boolean(getSetting(reminderIdKey(profileId)));
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (isNotificationGranted(existing)) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return isNotificationGranted(requested);
}
