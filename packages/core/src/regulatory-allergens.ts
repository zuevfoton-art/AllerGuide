/**
 * EU Reg. 1169/2011 Annex II — 14 mandatory food allergens.
 * Keys are normalized slugs / regulatory labels (lowercase, no language prefix).
 */
export const EU14_ALLERGEN_CODES: Record<string, string> = {
  // 1. Cereals containing gluten
  'cereals-containing-gluten': 'wheat-gluten',
  'gluten-containing-cereals': 'wheat-gluten',
  gluten: 'wheat-gluten',
  cereals: 'wheat-gluten',
  // 2. Crustaceans
  crustaceans: 'seafood',
  crustacean: 'seafood',
  // 3. Eggs
  eggs: 'eggs',
  egg: 'eggs',
  // 4. Fish
  fish: 'fish',
  // 5. Peanuts
  peanuts: 'peanut',
  peanut: 'peanut',
  // 6. Soybeans
  soybeans: 'soy',
  soybean: 'soy',
  soy: 'soy',
  soya: 'soy',
  // 7. Milk
  milk: 'milk',
  dairy: 'milk',
  // 8. Nuts (tree nuts)
  nuts: 'tree-nuts',
  'tree-nuts': 'tree-nuts',
  'tree-nut': 'tree-nuts',
  treenuts: 'tree-nuts',
  treenut: 'tree-nuts',
  // 9. Celery
  celery: 'celery',
  // 10. Mustard
  mustard: 'mustard',
  // 11. Sesame
  sesame: 'sesame',
  'sesame-seeds': 'sesame',
  // 12. Sulphur dioxide and sulphites
  sulphites: 'sulphites',
  sulfites: 'sulphites',
  'sulphur-dioxide-and-sulphites': 'sulphites',
  'sulfur-dioxide-and-sulfites': 'sulphites',
  // 13. Lupin
  lupin: 'lupin',
  // 14. Molluscs
  molluscs: 'seafood',
  mollusks: 'seafood',
};

/**
 * FDA FALCPA (Food Allergen Labeling and Consumer Protection Act) — Big 9.
 */
export const FDA9_ALLERGEN_CODES: Record<string, string> = {
  milk: 'milk',
  eggs: 'eggs',
  egg: 'eggs',
  fish: 'fish',
  'crustacean-shellfish': 'seafood',
  'crustacean shellfish': 'seafood',
  shellfish: 'seafood',
  crustaceans: 'seafood',
  'tree-nuts': 'tree-nuts',
  'tree nuts': 'tree-nuts',
  treenuts: 'tree-nuts',
  nuts: 'tree-nuts',
  peanuts: 'peanut',
  peanut: 'peanut',
  wheat: 'wheat-gluten',
  soybeans: 'soy',
  soybean: 'soy',
  soy: 'soy',
  sesame: 'sesame',
};

/**
 * Open Food Facts `allergens_tags` / `traces_tags` slugs (language prefix stripped).
 * @see https://wiki.openfoodfacts.org/Allergens
 */
export const OPEN_FOOD_FACTS_ALLERGEN_TAGS: Record<string, string> = {
  milk: 'milk',
  eggs: 'eggs',
  egg: 'eggs',
  peanuts: 'peanut',
  peanut: 'peanut',
  nuts: 'tree-nuts',
  'tree-nuts': 'tree-nuts',
  almonds: 'tree-nuts',
  walnuts: 'tree-nuts',
  cashews: 'tree-nuts',
  pistachios: 'tree-nuts',
  hazelnuts: 'hazelnut',
  hazelnut: 'hazelnut',
  fish: 'fish',
  crustaceans: 'seafood',
  molluscs: 'seafood',
  soybeans: 'soy',
  soy: 'soy',
  gluten: 'wheat-gluten',
  wheat: 'wheat-gluten',
  rye: 'rye',
  barley: 'barley',
  'sesame-seeds': 'sesame',
  sesame: 'sesame',
  celery: 'celery',
  mustard: 'mustard',
  lupin: 'lupin',
  sulphites: 'sulphites',
  sulfites: 'sulphites',
  'sulphur-dioxide-and-sulphites': 'sulphites',
  'sulfur-dioxide-and-sulfites': 'sulphites',
  citrus: 'citrus',
  honey: 'honey',
  chestnut: 'chestnut',
};

/** Merged regulatory vocabulary → canonical allergenId (EU14 + FDA9 + OFF). */
export const REGULATORY_ALLERGEN_ALIASES: Record<string, string> = {
  ...EU14_ALLERGEN_CODES,
  ...FDA9_ALLERGEN_CODES,
  ...OPEN_FOOD_FACTS_ALLERGEN_TAGS,
};

/** Canonical allergen ids covered by EU Annex II (one representative id per group). */
export const EU14_CANONICAL_ALLERGEN_IDS = [
  'wheat-gluten',
  'seafood',
  'eggs',
  'fish',
  'peanut',
  'soy',
  'milk',
  'tree-nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
] as const;

/** Canonical allergen ids covered by FDA FALCPA Big 9. */
export const FDA9_CANONICAL_ALLERGEN_IDS = [
  'milk',
  'eggs',
  'fish',
  'seafood',
  'tree-nuts',
  'peanut',
  'wheat-gluten',
  'soy',
  'sesame',
] as const;

export function normalizeExternalAllergenTerm(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^[a-z]{2}:/, '') // OFF language prefix, e.g. "en:milk"
    .replace(/^traces:/, '')
    .replace(/^may-contain-/, '')
    .replace(/\s+/g, '-');
}
