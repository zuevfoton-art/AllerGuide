import { getDb } from '@/src/db/init';
import { getSetting, setSetting } from '@/src/services/settings-service';
import type { EmergencyContact } from '@allerguide/core';

export function getEmergencyNumber(): string {
  return getSetting('emergencyNumber') || '103';
}

export function setEmergencyNumber(number: string) {
  setSetting('emergencyNumber', number.replace(/[^\d+]/g, '') || '103');
}

export function listEmergencyContacts(profileId: number): EmergencyContact[] {
  const db = getDb();
  return db.getAllSync<EmergencyContact>(
    'SELECT * FROM emergency_contacts WHERE profileId = ? ORDER BY id ASC',
    [profileId],
  );
}

export function addEmergencyContact(input: {
  profileId: number;
  name: string;
  phone: string;
  relation: string;
}) {
  const db = getDb();
  db.runSync(
    'INSERT INTO emergency_contacts (profileId, name, phone, relation) VALUES (?, ?, ?, ?)',
    [input.profileId, input.name.trim(), input.phone.trim(), input.relation.trim()],
  );
}

export function deleteEmergencyContact(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM emergency_contacts WHERE id = ?', [id]);
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
