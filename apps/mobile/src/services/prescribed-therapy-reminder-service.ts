import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getPrescribedReminderTimes,
  isPrescribedReminderConfigured,
  type PrescribedCourse,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { requestNotificationPermission } from '@/src/services/notification-service';

function reminderIdKey(profileId: number) {
  return `prescribedTherapyReminderId:${profileId}`;
}

function reminderIdsKey(profileId: number) {
  return `prescribedTherapyReminderIds:${profileId}`;
}

function readStoredReminderIds(profileId: number): string[] {
  const multi = getSetting(reminderIdsKey(profileId));
  if (multi?.trim()) {
    try {
      const parsed = JSON.parse(multi) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((id) => String(id).trim()).filter(Boolean);
      }
    } catch {
      // fall through to legacy single id
    }
  }
  const legacy = getSetting(reminderIdKey(profileId))?.trim();
  return legacy ? [legacy] : [];
}

async function cancelStoredReminderIds(profileId: number) {
  const ids = readStoredReminderIds(profileId);
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  setSetting(reminderIdsKey(profileId), '');
  setSetting(reminderIdKey(profileId), '');
}

export async function cancelPrescribedTherapyReminder(profileId: number) {
  if (Platform.OS === 'web') return;
  await cancelStoredReminderIds(profileId);
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

  const times = getPrescribedReminderTimes(course);
  const ids: string[] = [];
  for (const time of times) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: { type: 'prescribed-therapy', profileId, hour: time.hour, minute: time.minute },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
    ids.push(id);
  }

  setSetting(reminderIdsKey(profileId), JSON.stringify(ids));
  // Keep legacy key pointing at the first id for older reconciles / debug.
  setSetting(reminderIdKey(profileId), ids[0] ?? '');
  return ids.length > 0;
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
