import { findAllergenById, type AllergenRecord } from './allergen-database';

/**
 * Maps external allergen vocabularies (the food-allergy-db dataset, Open Food
 * Facts `allergens_tags`, etc.) to the canonical core allergen taxonomy.
 *
 * Keys are normalized (lowercased, `en:`/`fr:` language prefixes stripped).
 * Values are core allergen ids from `allergen-database.ts`.
 */
export const EXTERNAL_ALLERGEN_ALIASES: Record<string, string> = {
  // dairy
  milk: 'milk',
  dairy: 'milk',
  lactose: 'milk',
  // eggs
  egg: 'eggs',
  eggs: 'eggs',
  // peanut
  peanut: 'peanut',
  peanuts: 'peanut',
  // tree nuts
  treenut: 'tree-nuts',
  treenuts: 'tree-nuts',
  'tree-nut': 'tree-nuts',
  'tree-nuts': 'tree-nuts',
  nut: 'tree-nuts',
  nuts: 'tree-nuts',
  hazelnut: 'hazelnut',
  hazelnuts: 'hazelnut',
  // fish & seafood
  fish: 'fish',
  shellfish: 'seafood',
  crustaceans: 'seafood',
  crustacean: 'seafood',
  molluscs: 'seafood',
  mollusks: 'seafood',
  seafood: 'seafood',
  // soy
  soy: 'soy',
  soya: 'soy',
  soybeans: 'soy',
  soybean: 'soy',
  // wheat / gluten
  wheat: 'wheat-gluten',
  gluten: 'wheat-gluten',
  'gluten-containing-cereals': 'wheat-gluten',
  rye: 'rye',
  barley: 'barley',
  // sesame
  sesame: 'sesame',
  'sesame-seeds': 'sesame',
  // others present in the core taxonomy
  citrus: 'citrus',
  honey: 'honey',
  celery: 'celery',
  chestnut: 'chestnut',
};

function normalizeExternalTerm(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^[a-z]{2}:/, ''); // strip OFF language prefix, e.g. "en:milk"
}

/** Resolve an external allergen term to a core allergen record, if known. */
export function mapExternalAllergen(name: string): AllergenRecord | undefined {
  const id = EXTERNAL_ALLERGEN_ALIASES[normalizeExternalTerm(name)];
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
