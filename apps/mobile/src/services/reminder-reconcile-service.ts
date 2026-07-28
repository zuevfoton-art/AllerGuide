import { isAsitReminderConfigured, isPrescribedReminderConfigured } from '@allerguide/core';
import { reconcileClinicalReminders } from '@/src/services/clinical-reminder-service';
import { reconcilePollenReminders } from '@/src/services/pollen-reminder-service';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { scheduleAsitReminder, cancelAsitReminder } from '@/src/services/asit-reminder-service';
import { getPrescribedCourse } from '@/src/services/prescribed-therapy-service';
import {
  schedulePrescribedTherapyReminder,
  cancelPrescribedTherapyReminder,
} from '@/src/services/prescribed-therapy-reminder-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { listAllDiaryEntries } from '@/src/services/diary-service';
import {
  getAsitReminderNotificationContent,
  getDiaryReminderNotificationContent,
  getPrescribedTherapyReminderNotificationContent,
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
    } else {
      const course = getAsitCourse(profile.id);
      if (course && isAsitReminderConfigured(course)) {
        await scheduleAsitReminder(profile.id, course, getAsitReminderNotificationContent(course));
      }
    }

    const therapy = getPrescribedCourse(profile.id);
    if (!therapy || !isPrescribedReminderConfigured(therapy)) {
      await cancelPrescribedTherapyReminder(profile.id);
    } else {
      await schedulePrescribedTherapyReminder(
        profile.id,
        therapy,
        getPrescribedTherapyReminderNotificationContent(therapy),
      );
    }
  }

  await reconcileClinicalReminders();
  await reconcilePollenReminders();
}
