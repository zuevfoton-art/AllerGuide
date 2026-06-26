import {
  collectActReminderTriggers,
  collectDoctorVisitReminders,
  collectEpinephrineExpiryReminders,
  limitRemindersPerDay,
  type ScheduledReminderTrigger,
} from '@allerguide/core';
import { listAllDiaryEntries } from '@/src/services/diary-service';
import { getProfileConditions } from '@/src/services/profile-conditions-service';
import {
  getActReminderNotificationContent,
  getDoctorVisitReminderNotificationContent,
  getEpinephrineExpiryNotificationContent,
} from '@/src/services/notification-content-service';
import {
  appendClinicalReminderIds,
  cancelAllClinicalReminders,
  isActReminderEnabled,
  isEpinephrineReminderEnabled,
  isVisitReminderEnabled,
  scheduleDateNotification,
} from '@/src/services/notification-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { listProfiles } from '@/src/services/profile-service';
import { Platform } from 'react-native';

const MAX_CLINICAL_REMINDERS_PER_DAY = 3;

function contentForTrigger(trigger: ScheduledReminderTrigger) {
  if (trigger.kind === 'act') return getActReminderNotificationContent();
  if (trigger.kind === 'doctor-visit') {
    return getDoctorVisitReminderNotificationContent(trigger.visitLabel ?? 'Визит к врачу');
  }
  return getEpinephrineExpiryNotificationContent();
}

function payloadForTrigger(trigger: ScheduledReminderTrigger) {
  return {
    type: trigger.kind,
    profileId: trigger.profileId,
    scaleId: trigger.scaleId,
    entryId: trigger.entryId,
    visitLabel: trigger.visitLabel,
  };
}

export async function reconcileClinicalReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelAllClinicalReminders();

  const actEnabled = isActReminderEnabled();
  const visitEnabled = isVisitReminderEnabled();
  const epiEnabled = isEpinephrineReminderEnabled();
  if (!actEnabled && !visitEnabled && !epiEnabled) return;

  const now = new Date();
  const entries = listAllDiaryEntries();
  const profiles = listProfiles();
  const triggers: ScheduledReminderTrigger[] = [];

  if (actEnabled) {
    for (const profile of profiles) {
      const profileEntries = entries.filter((entry) => entry.profileId === profile.id);
      triggers.push(
        ...collectActReminderTriggers(profile.id, profileEntries, getProfileConditions(profile), now),
      );
    }
  }

  if (visitEnabled) {
    triggers.push(...collectDoctorVisitReminders(entries, now));
  }

  if (epiEnabled) {
    for (const profile of profiles) {
      const passport = getAllergyPassport(profile.id);
      triggers.push(
        ...collectEpinephrineExpiryReminders(profile.id, passport.epinephrine?.expiry, now),
      );
    }
  }

  const limited = limitRemindersPerDay(triggers, MAX_CLINICAL_REMINDERS_PER_DAY);
  const scheduledIds: string[] = [];

  for (const trigger of limited) {
    const id = await scheduleDateNotification(atFromTrigger(trigger), contentForTrigger(trigger), payloadForTrigger(trigger));
    if (id) scheduledIds.push(id);
  }

  await appendClinicalReminderIds(scheduledIds);
}

function atFromTrigger(trigger: ScheduledReminderTrigger): Date {
  return trigger.at;
}
