import { Platform } from 'react-native';
import type { Profile, ProfileType } from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { webCollections } from '@/src/db/web-collections';
import { nextNumericId } from '@/src/db/repositories/next-id';

export type ProfileRowWrite = {
  userId: number;
  name: string;
  birthYear: number;
  type: ProfileType;
  allergies: string;
  allergyConfirmations: string;
  crossReactionAllergies: string;
};

export type ProfileLegacyPatch = {
  userId: number;
  name: string;
  birthYear: number;
  type: ProfileType;
  allergies: string;
  allergyConfirmations: string;
};

export interface ProfileRepository {
  listByUserId(userId: number): Profile[];
  listAll(): Profile[];
  getById(id: number, userId: number): Profile | null;
  insert(row: ProfileRowWrite): Profile | null;
  update(id: number, userId: number, row: ProfileRowWrite): Profile | null;
  /** Cascades attachments, diary, scans, contacts, SOS, safe products. */
  deleteOwned(id: number, userId: number): boolean;
  updateLegacy(id: number, patch: ProfileLegacyPatch): void;
}

function toProfile(row: ProfileRowWrite, id: number): Profile {
  return {
    id,
    userId: row.userId,
    name: row.name,
    birthYear: row.birthYear,
    type: row.type,
    allergies: row.allergies,
    allergyConfirmations: row.allergyConfirmations,
    crossReactionAllergies: row.crossReactionAllergies,
  };
}

export const webProfileRepository: ProfileRepository = {
  listByUserId(userId) {
    return webCollections
      .getProfiles()
      .filter((profile) => profile.userId === userId)
      .sort((left, right) => left.id - right.id);
  },

  listAll() {
    return webCollections.getProfiles();
  },

  getById(id, userId) {
    return (
      webCollections
        .getProfiles()
        .find((profile) => profile.id === id && profile.userId === userId) ?? null
    );
  },

  insert(row) {
    const profiles = webCollections.getProfiles();
    const profile = toProfile(row, nextNumericId(profiles));
    profiles.push(profile);
    webCollections.saveProfiles(profiles);
    return profile;
  },

  update(id, userId, row) {
    const profiles = webCollections.getProfiles();
    const index = profiles.findIndex(
      (profile) => profile.id === id && profile.userId === userId,
    );
    if (index < 0) return null;
    const next = toProfile(row, id);
    profiles[index] = next;
    webCollections.saveProfiles(profiles);
    return next;
  },

  deleteOwned(id, userId) {
    const profiles = webCollections.getProfiles();
    const owned = profiles.some(
      (profile) => profile.id === id && profile.userId === userId,
    );
    if (!owned) return false;

    const diary = webCollections.getDiaryEntries();
    const entryIds = new Set(
      diary.filter((entry) => entry.profileId === id).map((entry) => entry.id),
    );
    if (entryIds.size > 0) {
      webCollections.saveDiaryAttachments(
        webCollections
          .getDiaryAttachments()
          .filter((attachment) => !entryIds.has(attachment.entryId)),
      );
    }
    webCollections.saveDiaryEntries(diary.filter((entry) => entry.profileId !== id));
    webCollections.saveScanHistory(
      webCollections.getScanHistory().filter((entry) => entry.profileId !== id),
    );
    webCollections.saveEmergencyContacts(
      webCollections.getEmergencyContacts().filter((item) => item.profileId !== id),
    );
    const sos = webCollections.getProfileSos();
    delete sos[id];
    webCollections.saveProfileSos(sos);
    webCollections.saveSafeProducts(
      webCollections.getSafeProducts().filter((item) => item.profileId !== id),
    );
    webCollections.saveProfiles(profiles.filter((profile) => profile.id !== id));
    return true;
  },

  updateLegacy(id, patch) {
    const profiles = webCollections.getProfiles();
    const index = profiles.findIndex((profile) => profile.id === id);
    if (index < 0) return;
    profiles[index] = {
      ...profiles[index],
      userId: patch.userId,
      name: patch.name,
      birthYear: patch.birthYear,
      type: patch.type,
      allergies: patch.allergies,
      allergyConfirmations: patch.allergyConfirmations,
    };
    webCollections.saveProfiles(profiles);
  },
};

export const sqliteProfileRepository: ProfileRepository = {
  listByUserId(userId) {
    return getDb().getAllSync<Profile>(
      'SELECT * FROM profiles WHERE userId = ? ORDER BY id ASC',
      [userId],
    );
  },

  listAll() {
    return getDb().getAllSync<Profile>('SELECT * FROM profiles');
  },

  getById(id, userId) {
    return getDb().getFirstSync<Profile>(
      'SELECT * FROM profiles WHERE id = ? AND userId = ?',
      [id, userId],
    );
  },

  insert(row) {
    const db = getDb();
    db.runSync(
      'INSERT INTO profiles (userId, name, birthYear, type, allergies, allergyConfirmations, crossReactionAllergies) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        row.userId,
        row.name,
        row.birthYear,
        row.type,
        row.allergies,
        row.allergyConfirmations,
        row.crossReactionAllergies,
      ],
    );
    const inserted = db.getFirstSync<{ id: number }>(
      'SELECT id FROM profiles WHERE userId = ? ORDER BY id DESC LIMIT 1',
      [row.userId],
    );
    if (!inserted?.id) return null;
    return db.getFirstSync<Profile>(
      'SELECT * FROM profiles WHERE id = ? AND userId = ?',
      [inserted.id, row.userId],
    );
  },

  update(id, userId, row) {
    const db = getDb();
    db.runSync(
      'UPDATE profiles SET userId = ?, name = ?, birthYear = ?, type = ?, allergies = ?, allergyConfirmations = ?, crossReactionAllergies = ? WHERE id = ? AND userId = ?',
      [
        row.userId,
        row.name,
        row.birthYear,
        row.type,
        row.allergies,
        row.allergyConfirmations,
        row.crossReactionAllergies,
        id,
        userId,
      ],
    );
    return db.getFirstSync<Profile>(
      'SELECT * FROM profiles WHERE id = ? AND userId = ?',
      [id, userId],
    );
  },

  deleteOwned(id, userId) {
    const db = getDb();
    const owned = db.getFirstSync<{ id: number }>(
      'SELECT id FROM profiles WHERE id = ? AND userId = ?',
      [id, userId],
    );
    if (!owned) return false;

    const diaryEntries = db.getAllSync<{ id: number }>(
      'SELECT id FROM diary_entries WHERE profileId = ?',
      [id],
    );
    for (const entry of diaryEntries) {
      db.runSync('DELETE FROM diary_attachments WHERE entryId = ?', [entry.id]);
    }

    db.runSync('DELETE FROM diary_entries WHERE profileId = ?', [id]);
    db.runSync('DELETE FROM scan_history WHERE profileId = ?', [id]);
    db.runSync('DELETE FROM emergency_contacts WHERE profileId = ?', [id]);
    db.runSync('DELETE FROM profile_sos WHERE profileId = ?', [id]);
    db.runSync('DELETE FROM safe_products WHERE profileId = ?', [id]);
    db.runSync('DELETE FROM profiles WHERE id = ? AND userId = ?', [id, userId]);
    return true;
  },

  updateLegacy(id, patch) {
    getDb().runSync(
      'UPDATE profiles SET userId = ?, name = ?, birthYear = ?, type = ?, allergies = ?, allergyConfirmations = ? WHERE id = ?',
      [
        patch.userId,
        patch.name,
        patch.birthYear,
        patch.type,
        patch.allergies,
        patch.allergyConfirmations,
        id,
      ],
    );
  },
};

export function getProfileRepository(): ProfileRepository {
  return Platform.OS === 'web' ? webProfileRepository : sqliteProfileRepository;
}
