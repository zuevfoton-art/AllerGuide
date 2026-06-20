import type { SyncPayload } from '@allerguide/core';

export interface SyncDb {
  runSync: (sql: string, params?: unknown[]) => void;
}

export function applySyncPayload(db: SyncDb, payload: SyncPayload, userId: number) {
  for (const profile of payload.profiles) {
    db.runSync(
      'INSERT OR REPLACE INTO profiles (id, userId, name, birthYear, type, allergies) VALUES (?, ?, ?, ?, ?, ?)',
      [profile.id, userId, profile.name, profile.birthYear, profile.type, profile.allergies],
    );
  }

  for (const entry of payload.diaryEntries) {
    db.runSync(
      'INSERT OR REPLACE INTO diary_entries (id, profileId, type, details, createdAt) VALUES (?, ?, ?, ?, ?)',
      [entry.id, entry.profileId, entry.type, entry.details, entry.createdAt],
    );
  }

  for (const contact of payload.emergencyContacts) {
    db.runSync(
      'INSERT OR REPLACE INTO emergency_contacts (id, profileId, name, phone, relation) VALUES (?, ?, ?, ?, ?)',
      [contact.id, contact.profileId, contact.name, contact.phone, contact.relation],
    );
  }

  for (const scan of payload.scanHistory ?? []) {
    db.runSync(
      'INSERT OR REPLACE INTO scan_history (id, profileId, mode, input, verdict, matches, level, productName, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        scan.id,
        scan.profileId,
        scan.mode,
        scan.input,
        scan.verdict,
        scan.matches,
        scan.level,
        scan.productName,
        scan.source,
        scan.createdAt,
      ],
    );
  }

  for (const sos of payload.profileSos ?? []) {
    db.runSync('INSERT OR REPLACE INTO profile_sos (profileId, notes) VALUES (?, ?)', [
      sos.profileId,
      sos.notes,
    ]);
  }

  for (const [key, value] of Object.entries(payload.appSettings ?? {})) {
    db.runSync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
  }
}
