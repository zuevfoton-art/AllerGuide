import { filterUserScopedSettings, type SyncPayload } from '@allerguide/core';

export interface SyncDb {
  runSync: (sql: string, params?: unknown[]) => void;
}

export function applySyncPayload(db: SyncDb, payload: SyncPayload, userId: number) {
  for (const profile of payload.profiles) {
    db.runSync(
      'INSERT OR REPLACE INTO profiles (id, userId, name, birthYear, type, allergies, allergyConfirmations) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        profile.id,
        userId,
        profile.name,
        profile.birthYear,
        profile.type,
        profile.allergies,
        profile.allergyConfirmations ?? '{}',
      ],
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

  // Mirror the allowlist the export applies. A backup file is untrusted input,
  // and on web the same app_settings store also backs "secure" settings such as
  // the refresh token and recovery key, so an unfiltered restore would let a
  // crafted file write keys the app never exports.
  const settings = filterUserScopedSettings(payload.appSettings ?? {});
  for (const [key, value] of Object.entries(settings)) {
    db.runSync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
  }
}
