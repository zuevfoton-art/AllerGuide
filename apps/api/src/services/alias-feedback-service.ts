import { eq } from 'drizzle-orm';
import { db } from '../db';
import { aliasFeedback } from '../db/catalog-schema';
import type { AliasFeedbackEntry, AliasFeedbackInput } from '@allerguide/core';
import { randomUUID } from 'crypto';

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function persistAliasFeedback(input: AliasFeedbackInput): Promise<AliasFeedbackEntry> {
  const entry: AliasFeedbackEntry = {
    id: randomUUID(),
    term: input.term.trim(),
    suggestedAllergenId: input.suggestedAllergenId,
    context: input.context,
    profileId: input.profileId,
    scanInput: input.scanInput,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    return entry;
  }

  await db.insert(aliasFeedback).values({
    id: entry.id,
    term: entry.term,
    suggestedAllergenId: entry.suggestedAllergenId ?? null,
    context: entry.context ?? null,
    profileId: entry.profileId ?? null,
    scanInput: entry.scanInput ?? null,
    status: entry.status,
    createdAt: new Date(entry.createdAt),
  });

  return entry;
}

export async function listPendingAliasFeedbackDb(): Promise<AliasFeedbackEntry[]> {
  if (!isDatabaseConfigured()) return [];

  const rows = await db
    .select()
    .from(aliasFeedback)
    .where(eq(aliasFeedback.status, 'pending'))
    .orderBy(aliasFeedback.createdAt);

  return rows.map((row) => ({
    id: row.id,
    term: row.term,
    suggestedAllergenId: row.suggestedAllergenId ?? undefined,
    context: row.context ?? undefined,
    profileId: row.profileId ?? undefined,
    scanInput: row.scanInput ?? undefined,
    status: row.status as AliasFeedbackEntry['status'],
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  }));
}

export async function updateAliasFeedbackStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const result = await db
    .update(aliasFeedback)
    .set({ status })
    .where(eq(aliasFeedback.id, id))
    .returning({ id: aliasFeedback.id });

  return result.length > 0;
}
