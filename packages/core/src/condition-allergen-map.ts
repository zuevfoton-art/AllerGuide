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
    alder: 'alder-pollen',
    'olive-pollen': 'olive-pollen',
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
    rodent: 'rodent',
    bird: 'bird',
    horse: 'horse',
    rabbit: 'rabbit',
  },
  insect: {
    bee: 'bee-venom',
    wasp: 'wasp-venom',
    hornet: 'hornet-venom',
    mosquito: 'mosquito',
  },
  drug: {
    penicillin: 'penicillin',
    aspirin: 'aspirin',
    nsaid: 'nsaid',
    cephalosporins: 'cephalosporins',
    paracetamol: 'paracetamol',
  },
};

/** Calendar / Open-Meteo pollen taxa without a dedicated allergen catalog row. */
export const CONDITION_OPTION_POLLEN_TAXON_MAP: Partial<
  Record<AllergyConditionId, Record<string, PollenTaxonId>>
> = {
  pollinosis: {
    alder: 'alder_pollen',
    hazel: 'hazel_pollen',
    'birch-pollen': 'birch_pollen',
    oak: 'oak_pollen',
    maple: 'maple_pollen',
    ash: 'ash_pollen',
    willow: 'willow_pollen',
    poplar: 'poplar_pollen',
    timothy: 'grass_pollen',
    meadow: 'grass_pollen',
    fescue: 'grass_pollen',
    'rye-grass': 'rye_pollen',
    raggrass: 'grass_pollen',
    'mugwort-pollen': 'mugwort_pollen',
    saltwort: 'saltwort_pollen',
    'ragweed-pollen': 'ragweed_pollen',
    'olive-pollen': 'olive_pollen',
  },
};

/** Pollinosis sub-options with calendar/Open-Meteo taxon but no dedicated allergen row. */
export const CALENDAR_ONLY_POLLEN_OPTION_IDS = new Set([
  'hazel',
  'oak',
  'maple',
  'ash',
  'willow',
  'poplar',
  'saltwort',
]);

export function isCalendarOnlyPollenOption(optionId: string): boolean {
  return CALENDAR_ONLY_POLLEN_OPTION_IDS.has(normalizeConditionOptionId('pollinosis', optionId));
}

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
