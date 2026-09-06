import { Platform } from 'react-native';
import type { DiaryEntry } from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { webCollections } from '@/src/db/web-collections';
import { nextNumericId } from '@/src/db/repositories/next-id';

export type DiaryEntryWrite = {
  profileId: number;
  type: string;
  details: string;
  createdAt: string;
};

export interface DiaryRepository {
  getById(id: number): DiaryEntry | null;
  listByProfileId(profileId: number): DiaryEntry[];
  listAll(): DiaryEntry[];
  insert(row: DiaryEntryWrite): DiaryEntry | null;
  update(id: number, profileId: number, patch: { type: string; details: string }): void;
  delete(id: number, profileId: number): void;
}

function byIdDesc(left: DiaryEntry, right: DiaryEntry): number {
  return right.id - left.id;
}

export const webDiaryRepository: DiaryRepository = {
  getById(id) {
    return webCollections.getDiaryEntries().find((entry) => entry.id === id) ?? null;
  },

  listByProfileId(profileId) {
    return webCollections
      .getDiaryEntries()
      .filter((entry) => entry.profileId === profileId)
      .sort(byIdDesc);
  },

  listAll() {
    return [...webCollections.getDiaryEntries()].sort(byIdDesc);
  },

  insert(row) {
    const entries = webCollections.getDiaryEntries();
    const entry: DiaryEntry = { id: nextNumericId(entries), ...row };
    entries.push(entry);
    webCollections.saveDiaryEntries(entries);
    return entry;
  },

  update(id, profileId, patch) {
    const entries = webCollections.getDiaryEntries();
    const index = entries.findIndex(
      (entry) => entry.id === id && entry.profileId === profileId,
    );
    if (index < 0) return;
    entries[index] = { ...entries[index], type: patch.type, details: patch.details };
    webCollections.saveDiaryEntries(entries);
  },

  delete(id, profileId) {
    webCollections.saveDiaryEntries(
      webCollections
        .getDiaryEntries()
        .filter((entry) => entry.id !== id || entry.profileId !== profileId),
    );
  },
};

export const sqliteDiaryRepository: DiaryRepository = {
  getById(id) {
    return getDb().getFirstSync<DiaryEntry>(
      'SELECT * FROM diary_entries WHERE id = ?',
      [id],
    );
  },

  listByProfileId(profileId) {
    return getDb().getAllSync<DiaryEntry>(
      'SELECT * FROM diary_entries WHERE profileId = ? ORDER BY id DESC',
      [profileId],
    );
  },

  listAll() {
    return getDb().getAllSync<DiaryEntry>(
      'SELECT * FROM diary_entries ORDER BY id DESC',
      [],
    );
  },

  insert(row) {
    const db = getDb();
    db.runSync(
      'INSERT INTO diary_entries (profileId, type, details, createdAt) VALUES (?, ?, ?, ?)',
      [row.profileId, row.type, row.details, row.createdAt],
    );
    return db.getFirstSync<DiaryEntry>(
      'SELECT * FROM diary_entries WHERE profileId = ? AND type = ? AND createdAt = ? ORDER BY id DESC LIMIT 1',
      [row.profileId, row.type, row.createdAt],
    );
  },

  update(id, profileId, patch) {
    getDb().runSync(
      'UPDATE diary_entries SET type = ?, details = ? WHERE id = ? AND profileId = ?',
      [patch.type, patch.details, id, profileId],
    );
  },

  delete(id, profileId) {
    getDb().runSync('DELETE FROM diary_entries WHERE id = ? AND profileId = ?', [
      id,
      profileId,
    ]);
  },
};

export function getDiaryRepository(): DiaryRepository {
  return Platform.OS === 'web' ? webDiaryRepository : sqliteDiaryRepository;
}
