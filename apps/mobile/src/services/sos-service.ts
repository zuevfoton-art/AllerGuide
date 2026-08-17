import { getDb } from '@/src/db/init';
import { getSetting, setSetting } from '@/src/services/settings-service';
import {
  addEmergencyContact,
  deleteEmergencyContact,
  listEmergencyContacts,
} from '@/src/services/emergency-contact-service';
import type { EmergencyContact } from '@allerguide/core';

export const DEFAULT_EMERGENCY_NUMBER = '103';

export type SosEmergencyBarModel = {
  emergencyNumber: string;
  firstContact: EmergencyContact | null;
};

/**
 * Always expose the emergency call. Contacts require a profile; the number does not.
 */
export function resolveSosEmergencyBar(input: {
  profileId: number | null;
  emergencyNumber: string;
  firstContact?: EmergencyContact | null;
}): SosEmergencyBarModel {
  const emergencyNumber = input.emergencyNumber.trim() || DEFAULT_EMERGENCY_NUMBER;
  if (input.profileId == null) {
    return { emergencyNumber, firstContact: null };
  }
  return {
    emergencyNumber,
    firstContact: input.firstContact ?? null,
  };
}

export function getEmergencyNumber(): string {
  return getSetting('emergencyNumber') || DEFAULT_EMERGENCY_NUMBER;
}

export function setEmergencyNumber(number: string) {
  setSetting('emergencyNumber', number.replace(/[^\d+]/g, '') || DEFAULT_EMERGENCY_NUMBER);
}

export function getSosNotes(profileId: number): string {
  const db = getDb();
  const row = db.getFirstSync<{ notes: string }>(
    'SELECT notes FROM profile_sos WHERE profileId = ?',
    [profileId],
  );
  return row?.notes ?? '';
}

export function saveSosNotes(profileId: number, notes: string) {
  const db = getDb();
  db.runSync('INSERT OR REPLACE INTO profile_sos (profileId, notes) VALUES (?, ?)', [
    profileId,
    notes.trim(),
  ]);
}

export function getProfileAge(birthYear?: number): string {
  if (!birthYear) return '';
  const age = new Date().getFullYear() - birthYear;
  return age > 0 && age < 130 ? `${age} лет` : String(birthYear);
}

export function getSosActionPlan(profileId: number): string {
  return getSetting(`sosPlan:${profileId}`) || '';
}

export function saveSosActionPlan(profileId: number, plan: string) {
  setSetting(`sosPlan:${profileId}`, plan.trim());
}

export { addEmergencyContact, deleteEmergencyContact, listEmergencyContacts };
