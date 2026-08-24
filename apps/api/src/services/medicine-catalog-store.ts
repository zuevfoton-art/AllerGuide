import { createHash } from 'node:crypto';
import { eq, ilike, or, sql } from 'drizzle-orm';
import {
  mergeMedicineCards,
  normalizeMedicineName,
  type MedicineCard,
  type MedicineConfidence,
} from '@allerguide/core';
import { db, readDb } from '../db';
import { medicines, type MedicineRow } from '../db/catalog-schema';

const MEDICINE_ID_HEX_LENGTH = 32;
const DEFAULT_SEARCH_LIMIT = 20;

export function medicineRowId(normalizedName: string): string {
  return createHash('sha256').update(normalizedName).digest('hex').slice(0, MEDICINE_ID_HEX_LENGTH);
}

function asConfidence(value: string): MedicineConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

export function medicineRowToCard(row: MedicineRow): MedicineCard {
  return {
    name: row.name,
    activeSubstance: row.activeSubstance,
    form: row.form,
    strength: row.strength,
    manufacturer: row.manufacturer,
    indications: row.indications,
    ageUsage: row.ageUsage ?? [],
    minAgeYears: row.minAgeYears,
    ingredients: row.ingredients,
    allergenTags: row.allergenTags ?? [],
    source: 'catalog',
    confidence: asConfidence(row.confidence),
  };
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export async function findMedicineByNormalizedName(
  normalizedName: string,
): Promise<MedicineRow | null> {
  if (!normalizedName) return null;
  const [row] = await readDb
    .select()
    .from(medicines)
    .where(eq(medicines.normalizedName, normalizedName))
    .limit(1);
  return row ?? null;
}

export async function searchMedicines(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
): Promise<MedicineRow[]> {
  const contains = `%${escapeIlike(query)}%`;
  const prefix = `${escapeIlike(query)}%`;
  const normalized = normalizeMedicineName(query);
  const normalizedContains = `%${escapeIlike(normalized)}%`;
  const normalizedPrefix = `${escapeIlike(normalized)}%`;

  return readDb
    .select()
    .from(medicines)
    .where(
      or(
        ilike(medicines.name, contains),
        ilike(medicines.activeSubstance, contains),
        ilike(medicines.normalizedName, normalizedContains),
      ),
    )
    .orderBy(
      sql`case
        when ${medicines.normalizedName} like ${normalizedPrefix} then 0
        when ${medicines.name} ilike ${prefix} then 1
        else 2
      end`,
      sql`${medicines.recognitions} desc`,
      medicines.name,
    )
    .limit(limit);
}

export async function upsertMedicineCard(card: MedicineCard): Promise<MedicineRow> {
  const normalizedName = normalizeMedicineName(card.name);
  const id = medicineRowId(normalizedName);
  const existing = await findMedicineByNormalizedName(normalizedName);
  const merged = existing ? mergeMedicineCards(medicineRowToCard(existing), card) : card;
  const [saved] = await db
    .insert(medicines)
    .values({
      id,
      normalizedName,
      name: merged.name,
      activeSubstance: merged.activeSubstance,
      form: merged.form,
      strength: merged.strength,
      manufacturer: merged.manufacturer,
      indications: merged.indications,
      ageUsage: merged.ageUsage,
      minAgeYears: merged.minAgeYears,
      ingredients: merged.ingredients,
      allergenTags: merged.allergenTags,
      source: merged.source,
      confidence: merged.confidence,
      recognitions: 1,
    })
    .onConflictDoUpdate({
      target: medicines.normalizedName,
      set: {
        name: sql`excluded.name`,
        activeSubstance: sql`excluded.active_substance`,
        form: sql`excluded.form`,
        strength: sql`excluded.strength`,
        manufacturer: sql`excluded.manufacturer`,
        indications: sql`excluded.indications`,
        ageUsage: sql`excluded.age_usage`,
        minAgeYears: sql`excluded.min_age_years`,
        ingredients: sql`excluded.ingredients`,
        allergenTags: sql`excluded.allergen_tags`,
        source: sql`excluded.source`,
        confidence: sql`excluded.confidence`,
        recognitions: sql`${medicines.recognitions} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved;
}

/** Curator cleanup: drop a wrong or test card from the shared catalog. */
export async function deleteMedicineByNormalizedName(normalizedName: string): Promise<boolean> {
  if (!normalizedName) return false;
  const deleted = await db
    .delete(medicines)
    .where(eq(medicines.normalizedName, normalizedName))
    .returning({ id: medicines.id });
  return deleted.length > 0;
}

export async function bumpMedicineRecognitions(id: string): Promise<void> {
  await db
    .update(medicines)
    .set({
      recognitions: sql`${medicines.recognitions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(medicines.id, id));
}
