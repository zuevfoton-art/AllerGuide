import { findAllergenById, type AllergenRecord } from './allergen-database';
import { resolveAllergenId } from './profile-allergens';
import {
  normalizeExternalAllergenTerm,
  REGULATORY_ALLERGEN_ALIASES,
} from './regulatory-allergens';

/**
 * Maps external allergen vocabularies (the food-allergy-db dataset, Open Food
 * Facts `allergens_tags`, etc.) to the canonical core allergen taxonomy.
 *
 * Keys are normalized (lowercased, `en:`/`fr:` language prefixes stripped).
 * Values are core allergen ids from `allergen-database.ts`.
 */
export const EXTERNAL_ALLERGEN_ALIASES: Record<string, string> = {
  ...REGULATORY_ALLERGEN_ALIASES,
  // dataset / free-form aliases beyond regulatory codes
  lactose: 'milk',
  nut: 'tree-nuts',
  shellfish: 'seafood',
};

export {
  EU14_ALLERGEN_CODES,
  EU14_CANONICAL_ALLERGEN_IDS,
  FDA9_ALLERGEN_CODES,
  FDA9_CANONICAL_ALLERGEN_IDS,
  normalizeExternalAllergenTerm,
  OPEN_FOOD_FACTS_ALLERGEN_TAGS,
  REGULATORY_ALLERGEN_ALIASES,
} from './regulatory-allergens';

/** Resolve an external allergen term to a canonical allergen id, if known. */
export function mapExternalAllergenToId(name: string): string | undefined {
  const normalized = normalizeExternalAllergenTerm(name);
  if (!normalized) return undefined;

  const fromAlias = EXTERNAL_ALLERGEN_ALIASES[normalized];
  if (fromAlias) return fromAlias;

  return resolveAllergenId(name) ?? undefined;
}

/**
 * Map external allergen terms (EU14 / FDA9 / OFF / dataset names) to canonical ids.
 * Unrecognized terms are skipped. Order-preserving and de-duplicated.
 */
export function mapExternalAllergenIds(names: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of names) {
    const id = mapExternalAllergenToId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}

/**
 * Expand stored allergen tags (ids or legacy labels) into scan-friendly text
 * (localized names + keywords) for ingredient string enrichment.
 */
export function expandAllergenTagsForScan(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const id = mapExternalAllergenToId(tag) ?? resolveAllergenId(tag);
    if (id) {
      const record = findAllergenById(id);
      if (record) {
        for (const part of [record.name, ...record.keywords]) {
          const key = part.toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          out.push(part);
        }
        continue;
      }
    }

    const trimmed = tag.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}

/** Resolve an external allergen term to a core allergen record, if known. */
export function mapExternalAllergen(name: string): AllergenRecord | undefined {
  const id = mapExternalAllergenToId(name);
  return id ? findAllergenById(id) : undefined;
}

/**
 * Map a list of external allergen terms to canonical RU allergen names.
 * Recognized terms become their core name; unrecognized terms are kept as-is
 * (trimmed) so no information is lost. Order-preserving and de-duplicated.
 */
export function mapExternalAllergenNames(names: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of names) {
    const mapped = mapExternalAllergen(raw)?.name ?? raw.trim();
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    out.push(mapped);
  }

  return out;
}
