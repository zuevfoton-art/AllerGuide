import { getDb, persistDbWrites } from '@/src/db/init';
import { enqueueAliasFeedback, type AliasFeedbackEntry, type AliasFeedbackInput } from '@allerguide/core';
import { apiRequest } from '@/src/services/api-client';
import { logCaughtError } from '@/src/services/error-reporting';
import { isOwnedProfile } from '@/src/services/owned-profiles';

export type AliasFeedbackMutationResult =
  | { ok: true; entry: AliasFeedbackEntry }
  | { ok: false; code: 'invalid_input' | 'profile_not_found' };

export type AliasFeedbackFlushResult = { synced: number; failed: number };

async function postAliasFeedbackEntry(entry: AliasFeedbackEntry): Promise<boolean> {
  const result = await apiRequest('/api/alias-feedback', {
    method: 'POST',
    body: {
      term: entry.term,
      suggestedAllergenId: entry.suggestedAllergenId,
      context: entry.context,
      profileId: entry.profileId,
      scanInput: entry.scanInput,
    },
  });
  return result.ok;
}

function deleteAliasFeedbackById(id: string): void {
  getDb().runSync('DELETE FROM alias_feedback WHERE id = ?', [id]);
}

/**
 * Drain local pending alias feedback to the API.
 * Successful posts remove the local row (server owns the queue after handoff).
 */
export async function flushPendingAliasFeedback(): Promise<AliasFeedbackFlushResult> {
  const pending = listPendingAliasFeedback();
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      const ok = await postAliasFeedbackEntry(entry);
      if (!ok) {
        failed += 1;
        continue;
      }
      deleteAliasFeedbackById(entry.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      logCaughtError('flushPendingAliasFeedback', error, {
        level: 'warn',
        extra: { term: entry.term },
      });
    }
  }

  if (synced > 0) {
    await persistDbWrites();
  }

  return { synced, failed };
}

export async function saveAliasFeedback(
  input: AliasFeedbackInput,
): Promise<AliasFeedbackMutationResult> {
  const term = input.term.trim();
  if (!term) {
    return { ok: false, code: 'invalid_input' };
  }
  if (input.profileId != null && !isOwnedProfile(input.profileId)) {
    return { ok: false, code: 'profile_not_found' };
  }

  const entry = enqueueAliasFeedback(input);

  getDb().runSync(
    `INSERT INTO alias_feedback
      (id, term, suggested_allergen_id, context, profile_id, scan_input, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.term,
      entry.suggestedAllergenId ?? null,
      entry.context ?? null,
      entry.profileId ?? null,
      entry.scanInput ?? null,
      entry.status,
      entry.createdAt,
    ],
  );
  await persistDbWrites();

  // Best-effort drain (includes this entry). Failures stay pending for next flush.
  void flushPendingAliasFeedback().catch((error) => {
    logCaughtError('saveAliasFeedback.flush', error, { level: 'warn', extra: { term: entry.term } });
  });

  return { ok: true, entry };
}

export function listPendingAliasFeedback(): AliasFeedbackEntry[] {
  return getDb().getAllSync<{
    id: string;
    term: string;
    suggested_allergen_id: string | null;
    context: string | null;
    profile_id: number | null;
    scan_input: string | null;
    status: string;
    created_at: string;
  }>(
    `SELECT id, term, suggested_allergen_id, context, profile_id, scan_input, status, created_at
     FROM alias_feedback
     WHERE status = 'pending'
     ORDER BY created_at DESC`,
  ).map((row) => ({
    id: row.id,
    term: row.term,
    suggestedAllergenId: row.suggested_allergen_id ?? undefined,
    context: row.context ?? undefined,
    profileId: row.profile_id ?? undefined,
    scanInput: row.scan_input ?? undefined,
    status: row.status as AliasFeedbackEntry['status'],
    createdAt: row.created_at,
  }));
}
