import { getSetting, setSetting } from '@/src/services/settings-service';
import {
  createDefaultPassport,
  parsePassport,
  serializePassport,
  type AllergyPassport,
} from '@allerguide/core';

function passportKey(profileId: number): string {
  return `sosPassport:${profileId}`;
}

export function getAllergyPassport(profileId: number): AllergyPassport {
  return parsePassport(getSetting(passportKey(profileId)));
}

export function saveAllergyPassport(profileId: number, passport: AllergyPassport) {
  setSetting(passportKey(profileId), serializePassport(passport));
}

export function resetAllergyPassport(profileId: number) {
  saveAllergyPassport(profileId, createDefaultPassport());
}

export { createDefaultPassport, parsePassport, serializePassport };
export type { AllergyPassport };
