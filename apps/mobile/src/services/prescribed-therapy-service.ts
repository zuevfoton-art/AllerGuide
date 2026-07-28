import {
  createDefaultPrescribedCourse,
  parsePrescribedCourse,
  serializePrescribedCourse,
  type PrescribedCourse,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';
import {
  cancelPrescribedTherapyReminder,
  syncPrescribedTherapyReminder,
} from '@/src/services/prescribed-therapy-reminder-service';
import { getPrescribedTherapyReminderNotificationContent } from '@/src/services/notification-content-service';

function courseKey(profileId: number) {
  return `prescribedTherapy:${profileId}`;
}

export function getPrescribedCourse(profileId: number): PrescribedCourse | null {
  return parsePrescribedCourse(getSetting(courseKey(profileId)));
}

export function savePrescribedCourse(profileId: number, course: PrescribedCourse): void {
  setSetting(courseKey(profileId), serializePrescribedCourse(course));
  void syncPrescribedTherapyReminder(
    profileId,
    course,
    getPrescribedTherapyReminderNotificationContent(course),
  );
}

export function createEmptyPrescribedCourse(): PrescribedCourse {
  return createDefaultPrescribedCourse();
}

export function clearPrescribedCourse(profileId: number): void {
  setSetting(courseKey(profileId), '');
  void cancelPrescribedTherapyReminder(profileId);
}
