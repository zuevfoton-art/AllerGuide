import { and, desc, eq } from 'drizzle-orm';
import type { Profile, ProfileInput } from '@allerguide/core';
import {
  dedupeAllergenIds,
  normalizeAllergyConfirmations,
  normalizeProfileAllergenIds,
  parseAllergyConfirmations,
  serializeAllergyConfirmations,
  serializeProfileAllergenIds,
  validateProfileInput,
  type ProfileValidationErrorCode,
} from '@allerguide/core';
import { db } from '../db';
import { profiles } from '../db/app-schema';

function toProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    birthYear: row.birthYear ?? 0,
    type: row.type as Profile['type'],
    allergies: row.allergies,
    allergyConfirmations: row.allergyConfirmations,
  };
}

function normalizeProfilePayload(input: ProfileInput) {
  const allergenIds = dedupeAllergenIds(input.allergies);
  return {
    allergies: serializeProfileAllergenIds(allergenIds),
    allergyConfirmations: serializeAllergyConfirmations(
      normalizeAllergyConfirmations(allergenIds, input.allergyConfirmations),
    ),
  };
}

export function validateProfilePayload(
  input: ProfileInput,
): ProfileValidationErrorCode | null {
  return validateProfileInput({
    name: input.name,
    birthYear: input.birthYear,
    type: input.type,
    allergies: input.allergies,
    childConsent: input.childConsent,
    scenario: input.scenario,
  });
}

export async function listProfilesForUser(userId: number): Promise<Profile[]> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .orderBy(desc(profiles.id));

  return rows.map(toProfile);
}

export async function getProfileForUser(userId: number, profileId: number): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .limit(1);

  return rows[0] ? toProfile(rows[0]) : null;
}

export async function createProfileForUser(userId: number, input: ProfileInput): Promise<Profile> {
  const validationError = validateProfilePayload(input);
  if (validationError) throw new Error(validationError);

  const payload = normalizeProfilePayload(input);
  const inserted = await db
    .insert(profiles)
    .values({
      userId,
      name: input.name.trim(),
      birthYear: input.birthYear,
      type: input.type,
      allergies: payload.allergies,
      allergyConfirmations: payload.allergyConfirmations,
    })
    .returning();

  const row = inserted[0];
  if (!row) throw new Error('Failed to create profile');
  return toProfile(row);
}

export async function updateProfileForUser(
  userId: number,
  profileId: number,
  input: ProfileInput,
): Promise<Profile | null> {
  const validationError = validateProfilePayload(input);
  if (validationError) throw new Error(validationError);

  const payload = normalizeProfilePayload(input);
  const updated = await db
    .update(profiles)
    .set({
      name: input.name.trim(),
      birthYear: input.birthYear,
      type: input.type,
      allergies: payload.allergies,
      allergyConfirmations: payload.allergyConfirmations,
      updatedAt: new Date(),
    })
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();

  return updated[0] ? toProfile(updated[0]) : null;
}

export async function deleteProfileForUser(userId: number, profileId: number): Promise<boolean> {
  const deleted = await db
    .delete(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning({ id: profiles.id });

  return deleted.length > 0;
}

export { parseAllergyConfirmations, normalizeAllergyConfirmations };
