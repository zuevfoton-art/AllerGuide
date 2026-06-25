import { describe, expect, it } from 'vitest';
import {
  EU14_ALLERGEN_CODES,
  EU14_CANONICAL_ALLERGEN_IDS,
  FDA9_ALLERGEN_CODES,
  FDA9_CANONICAL_ALLERGEN_IDS,
  normalizeExternalAllergenTerm,
  OPEN_FOOD_FACTS_ALLERGEN_TAGS,
} from './regulatory-allergens';
import {
  expandAllergenTagsForScan,
  mapExternalAllergenIds,
  mapExternalAllergenToId,
} from './allergen-aliases';

describe('regulatory allergen maps', () => {
  it('covers all 14 EU Annex II allergen groups', () => {
    expect(EU14_CANONICAL_ALLERGEN_IDS).toHaveLength(13);
    for (const id of EU14_CANONICAL_ALLERGEN_IDS) {
      expect(Object.values(EU14_ALLERGEN_CODES)).toContain(id);
    }
  });

  it('covers FDA FALCPA Big 9', () => {
    expect(FDA9_CANONICAL_ALLERGEN_IDS).toHaveLength(9);
    for (const id of FDA9_CANONICAL_ALLERGEN_IDS) {
      expect(Object.values(FDA9_ALLERGEN_CODES)).toContain(id);
    }
  });

  it('normalizes OFF language prefixes and trace prefixes', () => {
    expect(normalizeExternalAllergenTerm('en:milk')).toBe('milk');
    expect(normalizeExternalAllergenTerm('fr:gluten')).toBe('gluten');
    expect(normalizeExternalAllergenTerm('may-contain-nuts')).toBe('nuts');
    expect(normalizeExternalAllergenTerm('traces:soybeans')).toBe('soybeans');
    expect(normalizeExternalAllergenTerm('Crustacean shellfish')).toBe('crustacean-shellfish');
  });
});

describe('mapExternalAllergenToId', () => {
  it('maps EU14 regulatory slugs', () => {
    expect(mapExternalAllergenToId('cereals-containing-gluten')).toBe('wheat-gluten');
    expect(mapExternalAllergenToId('molluscs')).toBe('seafood');
    expect(mapExternalAllergenToId('mustard')).toBe('mustard');
    expect(mapExternalAllergenToId('sulphur-dioxide-and-sulphites')).toBe('sulphites');
    expect(mapExternalAllergenToId('lupin')).toBe('lupin');
  });

  it('maps FDA9 labels', () => {
    expect(mapExternalAllergenToId('Crustacean shellfish')).toBe('seafood');
    expect(mapExternalAllergenToId('tree nuts')).toBe('tree-nuts');
    expect(mapExternalAllergenToId('wheat')).toBe('wheat-gluten');
  });

  it('maps Open Food Facts tags', () => {
    expect(mapExternalAllergenToId('en:milk')).toBe('milk');
    expect(mapExternalAllergenToId('en:gluten')).toBe('wheat-gluten');
    expect(mapExternalAllergenToId('en:nuts')).toBe('tree-nuts');
    expect(mapExternalAllergenToId('en:hazelnuts')).toBe('hazelnut');
    expect(mapExternalAllergenToId('en:sesame-seeds')).toBe('sesame');
    expect(OPEN_FOOD_FACTS_ALLERGEN_TAGS.molluscs).toBe('seafood');
  });

  it('maps food-allergy dataset English names', () => {
    expect(mapExternalAllergenToId('Treenut')).toBe('tree-nuts');
    expect(mapExternalAllergenToId('Shellfish')).toBe('seafood');
    expect(mapExternalAllergenToId('Gluten')).toBe('wheat-gluten');
  });
});

describe('mapExternalAllergenIds', () => {
  it('returns deduplicated canonical ids in order', () => {
    expect(
      mapExternalAllergenIds(['en:milk', 'Milk', 'en:nuts', 'en:soybeans', 'Garlic']),
    ).toEqual(['milk', 'tree-nuts', 'soy']);
  });

  it('maps OFF traces alongside declared allergens', () => {
    expect(
      mapExternalAllergenIds(['en:milk', 'en:nuts', 'may-contain-soybeans']),
    ).toEqual(['milk', 'tree-nuts', 'soy']);
  });
});

describe('expandAllergenTagsForScan', () => {
  it('expands canonical ids to localized names and keywords', () => {
    const expanded = expandAllergenTagsForScan(['milk']);
    expect(expanded).toContain('Молоко');
    expect(expanded).toContain('лактоза');
  });

  it('expands legacy RU labels for backward compatibility', () => {
    const expanded = expandAllergenTagsForScan(['Молоко']);
    expect(expanded).toContain('Молоко');
    expect(expanded).toContain('лактоза');
  });
});
