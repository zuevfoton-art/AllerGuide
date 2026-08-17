import { createHash } from 'node:crypto';
import { eq, ilike, or, sql } from 'drizzle-orm';
import {
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
  const pattern = `%${escapeIlike(query)}%`;
  return readDb
    .select()
    .from(medicines)
    .where(or(ilike(medicines.name, pattern), ilike(medicines.activeSubstance, pattern)))
    .limit(limit);
}

export async function upsertMedicineCard(card: MedicineCard): Promise<MedicineRow> {
  const normalizedName = normalizeMedicineName(card.name);
  const id = medicineRowId(normalizedName);
  const [saved] = await db
    .insert(medicines)
    .values({
      id,
      normalizedName,
      name: card.name,
      activeSubstance: card.activeSubstance,
      form: card.form,
      strength: card.strength,
      manufacturer: card.manufacturer,
      indications: card.indications,
      ageUsage: card.ageUsage,
      minAgeYears: card.minAgeYears,
      ingredients: card.ingredients,
      allergenTags: card.allergenTags,
      source: card.source,
      confidence: card.confidence,
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

export async function bumpMedicineRecognitions(id: string): Promise<void> {
  await db
    .update(medicines)
    .set({
      recognitions: sql`${medicines.recognitions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(medicines.id, id));
}
