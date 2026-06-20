import { getDb } from '@/src/db/init';
import type { EmergencyContact, EmergencyContactInput, EmergencyContactRelation } from '@allerguide/core';

export function listEmergencyContacts(profileId: number): EmergencyContact[] {
  const db = getDb();
  return db.getAllSync<EmergencyContact>(
    'SELECT * FROM emergency_contacts WHERE profileId = ? ORDER BY id ASC',
    [profileId],
  );
}

export function addEmergencyContact(input: EmergencyContactInput & { profileId: number }) {
  const db = getDb();
  db.runSync(
    'INSERT INTO emergency_contacts (profileId, name, phone, relation) VALUES (?, ?, ?, ?)',
    [input.profileId, input.name.trim(), input.phone.trim(), input.relation],
  );
}

export function deleteEmergencyContact(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM emergency_contacts WHERE id = ?', [id]);
}

export function deleteEmergencyContactsByProfile(profileId: number) {
  const db = getDb();
  db.runSync('DELETE FROM emergency_contacts WHERE profileId = ?', [profileId]);
}

export function syncEmergencyContacts(
  profileId: number,
  contacts: EmergencyContactInput[],
) {
  deleteEmergencyContactsByProfile(profileId);

  for (const contact of contacts) {
    const name = contact.name.trim();
    const phone = contact.phone.trim();
    if (!name || !phone) continue;

    addEmergencyContact({
      profileId,
      name,
      phone,
      relation: contact.relation,
    });
  }
}

export type EmergencyContactDraft = EmergencyContactInput & { id?: number };

export function normalizeEmergencyContactDrafts(
  contacts: EmergencyContactDraft[],
): EmergencyContactInput[] {
  return contacts
    .map((contact) => ({
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      relation: contact.relation,
    }))
    .filter((contact) => contact.name && contact.phone);
}

export const DEFAULT_EMERGENCY_CONTACT_RELATION: EmergencyContactRelation = 'relative';
