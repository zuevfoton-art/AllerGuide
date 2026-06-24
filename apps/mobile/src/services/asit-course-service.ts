import {
  createDefaultAsitCourse,
  parseAsitCourse,
  serializeAsitCourse,
  type AsitCourse,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

function courseKey(profileId: number) {
  return `asitCourse:${profileId}`;
}

export function getAsitCourse(profileId: number): AsitCourse | null {
  return parseAsitCourse(getSetting(courseKey(profileId)));
}

export function saveAsitCourse(profileId: number, course: AsitCourse) {
  setSetting(courseKey(profileId), serializeAsitCourse(course));
}

export function createEmptyAsitCourse(): AsitCourse {
  return createDefaultAsitCourse();
}

export function clearAsitCourse(profileId: number) {
  setSetting(courseKey(profileId), '');
}
