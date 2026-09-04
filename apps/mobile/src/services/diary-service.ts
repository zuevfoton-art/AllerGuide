import { persistDbWrites } from '@/src/db/init';
import { getDiaryRepository } from '@/src/db/repositories';
import {
  getDiaryPhotoUrisFromAnswers,
  getDiaryEntryAnswers,
  parseDiaryPhotoUris,
} from '@allerguide/core';
import { getCurrentUserId } from '@/src/services/auth-service';
import { getOwnedProfileIds, isOwnedProfile } from '@/src/services/owned-profiles';
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

function getOwnedDiaryEntry(entryId: number): DiaryEntry | null {
  if (!Number.isSafeInteger(entryId) || entryId <= 0) return null;

  const entry = getDiaryRepository().getById(entryId);
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
  const diary = getDiaryRepository();
  const inserted = diary.insert(input);
  if (inserted == null) {
    return { ok: false, code: 'entry_not_found' };
  }
  const entryId = inserted.id;

  try {
    if (input.photoUris?.length) {
      await replaceDiaryPhotos(entryId, input.photoUris);
    } else {
      await syncPhotosFromDetails(entryId, input.details, input.type);
    }
  } catch (error) {
    await deleteDiaryAttachmentsForEntry(entryId);
    diary.delete(entryId, input.profileId);
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
  return getDiaryRepository().listByProfileId(profileId);
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

  getDiaryRepository().update(id, existing.profileId, { type, details: input.details });
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
  getDiaryRepository().delete(id, existing.profileId);
  await persistDbWrites();
  return { ok: true, entryId: id };
}

export function listAllDiaryEntries(): DiaryEntry[] {
  const profileIds = new Set(getOwnedProfileIds());
  if (profileIds.size === 0) return [];

  return getDiaryRepository()
    .listAll()
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
