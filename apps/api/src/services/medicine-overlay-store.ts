import { and, eq, ilike, or } from 'drizzle-orm';
import {
  mergeMedicineCards,
  normalizeMedicineName,
  type MedicineCard,
  type MedicineConfidence,
  type MedicineSource,
} from '@allerguide/core';
import { db } from '../db';
import { medicineOverlays, type MedicineOverlayRow } from '../db/app-schema';
import { escapeIlike } from './medicine-catalog-store';

const DEFAULT_SEARCH_LIMIT = 20;

function asConfidence(value: string): MedicineConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

function asSource(value: string): MedicineSource {
  if (value === 'catalog' || value === 'vision' || value === 'ocr' || value === 'manual') {
    return value;
  }
  return 'manual';
}

export function overlayRowToCard(row: MedicineOverlayRow): MedicineCard {
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
    aliases: row.aliases ?? [],
    source: asSource(row.source),
    confidence: asConfidence(row.confidence),
  };
}

export async function findMedicineOverlay(
  userId: number,
  normalizedName: string,
): Promise<MedicineOverlayRow | null> {
  if (!normalizedName) return null;
  const [row] = await db
    .select()
    .from(medicineOverlays)
    .where(
      and(eq(medicineOverlays.userId, userId), eq(medicineOverlays.normalizedName, normalizedName)),
    )
    .limit(1);
  return row ?? null;
}

export async function searchMedicineOverlays(
  userId: number,
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
): Promise<MedicineOverlayRow[]> {
  const escaped = escapeIlike(query);
  const normalized = normalizeMedicineName(query);
  const contains = `%${escaped}%`;
  const normalizedContains = `%${escapeIlike(normalized)}%`;

  return db
    .select()
    .from(medicineOverlays)
    .where(
      and(
        eq(medicineOverlays.userId, userId),
        or(
          ilike(medicineOverlays.name, contains),
          ilike(medicineOverlays.activeSubstance, contains),
          ilike(medicineOverlays.normalizedName, normalizedContains),
        ),
      ),
    )
    .limit(limit);
}

export async function upsertMedicineOverlay(
  userId: number,
  card: MedicineCard,
): Promise<MedicineOverlayRow> {
  const normalizedName = normalizeMedicineName(card.name);
  const existing = await findMedicineOverlay(userId, normalizedName);
  const merged = existing ? mergeMedicineCards(overlayRowToCard(existing), card) : card;

  const [saved] = await db
    .insert(medicineOverlays)
    .values({
      userId,
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
      aliases: merged.aliases,
      source: merged.source,
      confidence: merged.confidence,
    })
    .onConflictDoUpdate({
      target: [medicineOverlays.userId, medicineOverlays.normalizedName],
      set: {
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
        aliases: merged.aliases,
        source: merged.source,
        confidence: merged.confidence,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved;
}

export async function deleteMedicineOverlay(
  userId: number,
  normalizedName: string,
): Promise<boolean> {
  if (!normalizedName) return false;
  const deleted = await db
    .delete(medicineOverlays)
    .where(
      and(eq(medicineOverlays.userId, userId), eq(medicineOverlays.normalizedName, normalizedName)),
    )
    .returning({ normalizedName: medicineOverlays.normalizedName });
  return deleted.length > 0;
}

export function mergeCatalogAndOverlayCards(
  catalog: MedicineCard[],
  overlays: MedicineCard[],
): MedicineCard[] {
  const byName = new Map<string, MedicineCard>();
  for (const card of catalog) {
    byName.set(normalizeMedicineName(card.name), card);
  }
  for (const card of overlays) {
    byName.set(normalizeMedicineName(card.name), card);
  }
  return [...byName.values()];
}
