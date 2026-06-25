import { ALLERGENS, findAllergenById, findAllergenByName, type AllergenRecord } from './allergen-database';

/** Canonical allergen id from `allergen-database` (e.g. `milk`, `birch-pollen`). */
export type ProfileAllergenId = string;

const allergenIdSet = new Set(ALLERGENS.map((item) => item.id));

/**
 * Resolve a stored value (legacy RU label or id) to a canonical allergen id.
 */
export function resolveAllergenId(value: string): ProfileAllergenId | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (allergenIdSet.has(trimmed)) return trimmed;

  const byName = findAllergenByName(trimmed);
  if (byName) return byName.id;

  const lower = trimmed.toLowerCase();
  const byLowerName = ALLERGENS.find((item) => item.name.toLowerCase() === lower);
  if (byLowerName) return byLowerName.id;

  if (allergenIdSet.has(lower)) return lower;

  return null;
}

/** Parse `profiles.allergies` JSON into canonical allergen ids (migrates legacy labels). */
export function parseProfileAllergenIds(allergiesJson: string): ProfileAllergenId[] {
  let raw: unknown;
  try {
    raw = JSON.parse(allergiesJson);
  } catch {
    return [];
  }

  if (!Array.isArray(raw)) return [];

  const ids = new Set<ProfileAllergenId>();
  for (const item of raw) {
    const id = resolveAllergenId(String(item));
    if (id) ids.add(id);
  }

  return [...ids];
}

/** Display labels for UI / PDF (localized names from taxonomy). */
export function parseAllergies(allergiesJson: string): string[] {
  return parseProfileAllergenIds(allergiesJson).map((id) => findAllergenById(id)?.name ?? id);
}

/** Serialize validated allergen ids for `profiles.allergies`. */
export function serializeProfileAllergenIds(ids: string[]): string {
  const unique = [...new Set(ids.map(resolveAllergenId).filter((id): id is string => Boolean(id)))];
  return JSON.stringify(unique);
}

/** Normalize profile input allergies (ids or legacy labels) before persistence. */
export function normalizeProfileAllergenIds(values: string[]): ProfileAllergenId[] {
  return [...new Set(values.map(resolveAllergenId).filter((id): id is string => Boolean(id)))];
}

/** Migrate stored JSON to canonical ids (no-op when already ids). */
export function migrateProfileAllergiesJson(allergiesJson: string): string {
  return serializeProfileAllergenIds(parseProfileAllergenIds(allergiesJson));
}

export function getAllergenRecords(ids: ProfileAllergenId[]): AllergenRecord[] {
  return ids.map((id) => findAllergenById(id)).filter((item): item is AllergenRecord => Boolean(item));
}

export function getFoodAllergenIds(ids: ProfileAllergenId[]): ProfileAllergenId[] {
  return ids.filter((id) => findAllergenById(id)?.category === 'food');
}

export function getFoodAllergenLabels(ids: ProfileAllergenId[]): string[] {
  return getFoodAllergenIds(ids).map((id) => findAllergenById(id)!.name);
}

/** Open-Meteo hourly keys → canonical pollen allergen ids. */
export const OPEN_METEO_POLLEN_ALLERGEN_IDS: Record<string, ProfileAllergenId> = {
  birch_pollen: 'birch-pollen',
  grass_pollen: 'grass-pollen',
  ragweed_pollen: 'ragweed-pollen',
};

export function profileHasPollenAllergen(
  profileAllergenIds: ProfileAllergenId[],
  pollenAllergenId: ProfileAllergenId,
): boolean {
  return profileAllergenIds.includes(pollenAllergenId);
}
