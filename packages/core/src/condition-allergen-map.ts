import type { AllergyConditionId } from './allergy-conditions';
import type { ProfileAllergenId } from './profile-allergens';
import type { PollenTaxonId } from './pollen-taxonomy';

/** Maps condition sub-option ids to canonical allergen ids (when present in allergen-database). */
export const CONDITION_OPTION_ALLERGEN_MAP: Partial<
  Record<AllergyConditionId, Record<string, ProfileAllergenId>>
> = {
  food: {
    milk: 'milk',
    eggs: 'eggs',
    'wheat-gluten': 'wheat-gluten',
    'tree-nuts': 'tree-nuts',
    fish: 'fish',
    seafood: 'seafood',
    soy: 'soy',
    peanut: 'peanut',
  },
  pollinosis: {
    'birch-pollen': 'birch-pollen',
    'ragweed-pollen': 'ragweed-pollen',
    'mugwort-pollen': 'mugwort-pollen',
    timothy: 'grass-pollen',
    meadow: 'grass-pollen',
    fescue: 'grass-pollen',
    'rye-grass': 'grass-pollen',
    raggrass: 'grass-pollen',
  },
  household: {
    'house-dust': 'house-dust',
    'dust-mites': 'dust-mites',
    mold: 'mold',
  },
  animal: {
    'cat-dander': 'cat-dander',
    'dog-dander': 'dog-dander',
  },
  insect: {
    bee: 'insect-stings',
    wasp: 'insect-stings',
    hornet: 'insect-stings',
    mosquito: 'insect-stings',
  },
};

/** Calendar / Open-Meteo pollen taxa without a dedicated allergen catalog row. */
export const CONDITION_OPTION_POLLEN_TAXON_MAP: Partial<
  Record<AllergyConditionId, Record<string, PollenTaxonId>>
> = {
  pollinosis: {
    alder: 'alder_pollen',
    'birch-pollen': 'birch_pollen',
    timothy: 'grass_pollen',
    meadow: 'grass_pollen',
    fescue: 'grass_pollen',
    'rye-grass': 'rye_pollen',
    raggrass: 'grass_pollen',
    'mugwort-pollen': 'mugwort_pollen',
    'ragweed-pollen': 'ragweed_pollen',
    oak: 'oak_pollen',
  },
};

/** Legacy option ids kept for backward compatibility with stored UI selections. */
export const LEGACY_CONDITION_OPTION_ALIASES: Partial<
  Record<AllergyConditionId, Record<string, string>>
> = {
  food: { wheat: 'wheat-gluten' },
  pollinosis: {
    birch: 'birch-pollen',
    ragweed: 'ragweed-pollen',
    wormwood: 'mugwort-pollen',
  },
  household: {
    dust: 'house-dust',
    'dust-mite': 'dust-mites',
  },
  animal: {
    cat: 'cat-dander',
    dog: 'dog-dander',
  },
};

export function normalizeConditionOptionId(
  conditionId: AllergyConditionId,
  optionId: string,
): string {
  const trimmed = optionId.trim();
  if (!trimmed) return trimmed;
  return LEGACY_CONDITION_OPTION_ALIASES[conditionId]?.[trimmed] ?? trimmed;
}

export function resolveConditionOptionAllergenId(
  conditionId: AllergyConditionId,
  optionId: string,
): ProfileAllergenId | null {
  const normalized = normalizeConditionOptionId(conditionId, optionId);
  const direct = CONDITION_OPTION_ALLERGEN_MAP[conditionId]?.[normalized];
  if (direct) return direct;

  const aliasTarget = LEGACY_CONDITION_OPTION_ALIASES[conditionId]?.[optionId.trim()];
  if (aliasTarget) {
    return CONDITION_OPTION_ALLERGEN_MAP[conditionId]?.[aliasTarget] ?? null;
  }

  return null;
}

export function resolveConditionOptionPollenTaxonId(
  conditionId: AllergyConditionId,
  optionId: string,
): PollenTaxonId | null {
  const normalized = normalizeConditionOptionId(conditionId, optionId);
  return CONDITION_OPTION_POLLEN_TAXON_MAP[conditionId]?.[normalized] ?? null;
}

export function resolveConditionOptionsToAllergenIds(
  conditionId: AllergyConditionId,
  optionIds: string[],
): ProfileAllergenId[] {
  const result = new Set<ProfileAllergenId>();
  for (const optionId of optionIds) {
    const allergenId = resolveConditionOptionAllergenId(conditionId, optionId);
    if (allergenId) result.add(allergenId);
  }
  return [...result];
}
