import { getDb, persistDbWrites } from '@/src/db/init';
import {
  getDiaryPhotoUrisFromAnswers,
  getDiaryEntryAnswers,
  parseDiaryPhotoUris,
} from '@allerguide/core';
import { getCurrentUserId } from '@/src/services/auth-service';
import { trackEvent } from '@/src/services/analytics-service';
import {
  deleteDiaryAttachmentsForEntry,
  listDiaryAttachments,
  replaceDiaryPhotos,
} from '@/src/services/diary-attachment-service';
import type { DiaryEntry } from '@/src/types';

export type DiaryMutationErrorCode =
  | 'not_authenticated'
  | 'profile_not_found'
  | 'entry_not_found'
  | 'invalid_input';

export type DiaryMutationResult =
  | { ok: true; entryId: number }
  | { ok: false; code: DiaryMutationErrorCode };

type DiaryEntryInput = {
  profileId: number;
  type: string;
  details: string;
  createdAt: string;
  photoUris?: string[];
};

function getOwnedProfileIds(): number[] {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const db = getDb();
  return db
    .getAllSync<{ id: number }>('SELECT id FROM profiles WHERE userId = ?', [userId])
    .map((profile) => profile.id);
}

function isOwnedProfile(profileId: number): boolean {
  return getOwnedProfileIds().includes(profileId);
}

function getOwnedDiaryEntry(entryId: number): DiaryEntry | null {
  if (!Number.isSafeInteger(entryId) || entryId <= 0) return null;

  const db = getDb();
  const entry = db.getFirstSync<DiaryEntry>(
    'SELECT * FROM diary_entries WHERE id = ?',
    [entryId],
  );
  if (!entry || !isOwnedProfile(entry.profileId)) return null;
  return entry;
}

function normalizeDiaryEntryInput(input: DiaryEntryInput): DiaryEntryInput | null {
  const type = input.type.trim();
  if (
    !Number.isSafeInteger(input.profileId) ||
    input.profileId <= 0 ||
    !type ||
    typeof input.details !== 'string' ||
    !input.createdAt.trim() ||
    Number.isNaN(Date.parse(input.createdAt))
  ) {
    return null;
  }

  return { ...input, type };
}

function resolveInsertedEntryId(profileId: number, type: string, createdAt: string): number | null {
  const db = getDb();
  const row = db.getFirstSync<{ id: number }>(
    'SELECT id FROM diary_entries WHERE profileId = ? AND type = ? AND createdAt = ? ORDER BY id DESC LIMIT 1',
    [profileId, type, createdAt],
  );
  return row?.id ?? null;
}

async function syncPhotosFromDetails(entryId: number, details: string, type: string): Promise<void> {
  const answers = getDiaryEntryAnswers(type, details);
  // Photos are stripped from encoded details — callers pass pending URIs separately via answers overlay.
  // Fallback: parse if still present (legacy / in-memory before strip).
  const fromAnswers = answers ? getDiaryPhotoUrisFromAnswers(answers) : [];
  if (fromAnswers.length) {
    await replaceDiaryPhotos(entryId, fromAnswers);
  }
}

async function insertDiaryEntry(input: DiaryEntryInput): Promise<DiaryMutationResult> {
  const db = getDb();
  db.runSync('INSERT INTO diary_entries (profileId, type, details, createdAt) VALUES (?, ?, ?, ?)', [
    input.profileId,
    input.type,
    input.details,
    input.createdAt,
  ]);
  const entryId = resolveInsertedEntryId(input.profileId, input.type, input.createdAt);
  if (entryId == null) {
    return { ok: false, code: 'entry_not_found' };
  }

  try {
    if (input.photoUris?.length) {
      await replaceDiaryPhotos(entryId, input.photoUris);
    } else {
      await syncPhotosFromDetails(entryId, input.details, input.type);
    }
  } catch (error) {
    await deleteDiaryAttachmentsForEntry(entryId);
    db.runSync('DELETE FROM diary_entries WHERE id = ? AND profileId = ?', [
      entryId,
      input.profileId,
    ]);
    await persistDbWrites();
    throw error;
  }

  await persistDbWrites();
  trackEvent('diary_entry_saved', { entry_type: input.type });
  return { ok: true, entryId };
}

export async function addDiaryEntry(input: DiaryEntryInput): Promise<DiaryMutationResult> {
  const normalized = normalizeDiaryEntryInput(input);
  if (!normalized) return { ok: false, code: 'invalid_input' };
  if (!getCurrentUserId()) return { ok: false, code: 'not_authenticated' };
  if (!isOwnedProfile(normalized.profileId)) {
    return { ok: false, code: 'profile_not_found' };
  }

  return insertDiaryEntry(normalized);
}

export async function addDiaryEntries(
  profileId: number,
  entries: { type: string; details: string; photoUris?: string[] }[],
  createdAt = new Date().toISOString(),
): Promise<DiaryMutationResult[]> {
  if (!getCurrentUserId()) {
    return [{ ok: false, code: 'not_authenticated' }];
  }
  if (!isOwnedProfile(profileId)) {
    return [{ ok: false, code: 'profile_not_found' }];
  }

  const normalizedEntries = entries.map((entry) =>
    normalizeDiaryEntryInput({
      profileId,
      type: entry.type,
      details: entry.details,
      createdAt,
      photoUris: entry.photoUris,
    }),
  );
  const validEntries = normalizedEntries.filter(
    (entry): entry is DiaryEntryInput => entry !== null,
  );
  if (validEntries.length !== normalizedEntries.length) {
    return [{ ok: false, code: 'invalid_input' }];
  }

  const results: DiaryMutationResult[] = [];
  for (const entry of validEntries) {
    results.push(await insertDiaryEntry(entry));
  }
  return results;
}

export async function getDiaryEntries(profileId: number) {
  if (!isOwnedProfile(profileId)) return [];
  const db = getDb();
  return db.getAllSync<DiaryEntry>(
    'SELECT * FROM diary_entries WHERE profileId = ? ORDER BY id DESC',
    [profileId],
  );
}

export async function updateDiaryEntry(
  id: number,
  input: { type: string; details: string; photoUris?: string[] },
): Promise<DiaryMutationResult> {
  const existing = getOwnedDiaryEntry(id);
  if (!existing) return { ok: false, code: 'entry_not_found' };
  const type = input.type.trim();
  if (!type || typeof input.details !== 'string') {
    return { ok: false, code: 'invalid_input' };
  }

  const db = getDb();
  db.runSync('UPDATE diary_entries SET type = ?, details = ? WHERE id = ? AND profileId = ?', [
    type,
    input.details,
    id,
    existing.profileId,
  ]);
  if (input.photoUris) {
    await replaceDiaryPhotos(id, input.photoUris);
  }
  await persistDbWrites();
  return { ok: true, entryId: id };
}

export async function deleteDiaryEntry(id: number): Promise<DiaryMutationResult> {
  const existing = getOwnedDiaryEntry(id);
  if (!existing) return { ok: false, code: 'entry_not_found' };

  await deleteDiaryAttachmentsForEntry(id);
  const db = getDb();
  db.runSync('DELETE FROM diary_entries WHERE id = ? AND profileId = ?', [
    id,
    existing.profileId,
  ]);
  await persistDbWrites();
  return { ok: true, entryId: id };
}

export function listAllDiaryEntries(): DiaryEntry[] {
  const profileIds = new Set(getOwnedProfileIds());
  if (profileIds.size === 0) return [];

  const db = getDb();
  return db
    .getAllSync<DiaryEntry>('SELECT * FROM diary_entries ORDER BY id DESC', [])
    .filter((entry) => profileIds.has(entry.profileId));
}

export function getEntryPhotoUris(entryId: number): string[] {
  return listDiaryAttachments(entryId).map((item) => item.localPath);
}

/** Merge stored attachment URIs into answers for wizard edit. */
export function mergePhotosIntoAnswers(
  answers: Record<string, string>,
  entryId: number,
): Record<string, string> {
  const uris = getEntryPhotoUris(entryId);
  if (!uris.length) return answers;
  return {
    ...answers,
    skinPhotos: JSON.stringify(uris),
  };
}

export { parseDiaryPhotoUris };
