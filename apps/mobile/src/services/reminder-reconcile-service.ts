import { isAsitReminderConfigured } from '@allerguide/core';
import { reconcileClinicalReminders } from '@/src/services/clinical-reminder-service';
import { reconcilePollenReminders } from '@/src/services/pollen-reminder-service';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { scheduleAsitReminder, cancelAsitReminder } from '@/src/services/asit-reminder-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { listAllDiaryEntries } from '@/src/services/diary-service';
import {
  getAsitReminderNotificationContent,
  getDiaryReminderNotificationContent,
} from '@/src/services/notification-content-service';
import { rescheduleDiaryReminderIfEnabled } from '@/src/services/notification-service';
import { listProfiles } from '@/src/services/profile-service';
import { Platform } from 'react-native';

export async function reconcileAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const entries = listAllDiaryEntries();
  const diaryContent = getDiaryReminderNotificationContent();
  await rescheduleDiaryReminderIfEnabled(diaryContent, entries);

  const profiles = listProfiles();
  for (const profile of profiles) {
    const capabilities = getProfileCapabilities(profile);
    if (!capabilities.modules.asit) {
      await cancelAsitReminder(profile.id);
      continue;
    }
    const course = getAsitCourse(profile.id);
    if (!course || !isAsitReminderConfigured(course)) continue;
    await scheduleAsitReminder(profile.id, course, getAsitReminderNotificationContent(course));
  }

  await reconcileClinicalReminders();
  await reconcilePollenReminders();
}
