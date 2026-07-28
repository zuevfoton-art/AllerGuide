import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  isPrescribedReminderConfigured,
  type PrescribedCourse,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { requestNotificationPermission } from '@/src/services/notification-service';

function reminderIdKey(profileId: number) {
  return `prescribedTherapyReminderId:${profileId}`;
}

export async function cancelPrescribedTherapyReminder(profileId: number) {
  if (Platform.OS === 'web') return;

  const existing = getSetting(reminderIdKey(profileId));
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
    setSetting(reminderIdKey(profileId), '');
  }
}

export async function schedulePrescribedTherapyReminder(
  profileId: number,
  course: PrescribedCourse,
  content: { title: string; body: string },
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!isPrescribedReminderConfigured(course)) {
    await cancelPrescribedTherapyReminder(profileId);
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelPrescribedTherapyReminder(profileId);

  const hour = course.reminderHour ?? 8;
  const minute = course.reminderMinute ?? 0;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { type: 'prescribed-therapy', profileId },
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

export async function syncPrescribedTherapyReminder(
  profileId: number,
  course: PrescribedCourse | null,
  content: { title: string; body: string },
): Promise<boolean> {
  if (!course || !isPrescribedReminderConfigured(course)) {
    await cancelPrescribedTherapyReminder(profileId);
    return true;
  }
  return schedulePrescribedTherapyReminder(profileId, course, content);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  return requestNotificationPermission();
}
