import {
  createDefaultAsitCourse,
  parseAsitCourse,
  serializeAsitCourse,
  type AsitCourse,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { cancelAsitReminder, syncAsitReminder } from '@/src/services/asit-reminder-service';
import { getAsitReminderNotificationContent } from '@/src/services/notification-content-service';

function courseKey(profileId: number) {
  return `asitCourse:${profileId}`;
}

export function getAsitCourse(profileId: number): AsitCourse | null {
  return parseAsitCourse(getSetting(courseKey(profileId)));
}

export function saveAsitCourse(profileId: number, course: AsitCourse) {
  setSetting(courseKey(profileId), serializeAsitCourse(course));
  void syncAsitReminder(profileId, course, getAsitReminderNotificationContent(course));
}

export function createEmptyAsitCourse(): AsitCourse {
  return createDefaultAsitCourse();
}

export function clearAsitCourse(profileId: number) {
  setSetting(courseKey(profileId), '');
  void cancelAsitReminder(profileId);
}
