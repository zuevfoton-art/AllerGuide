import { getDb } from '@/src/db/init';
import { enqueueAliasFeedback, type AliasFeedbackEntry, type AliasFeedbackInput } from '@allerguide/core';

export function saveAliasFeedback(input: AliasFeedbackInput): AliasFeedbackEntry {
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

  return entry;
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
