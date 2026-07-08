import { describe, expect, it } from 'vitest';
import {
  migrateProfileAllergiesJson,
  parseAllergies,
  parseProfileAllergenIds,
  profileHasPollenAllergen,
  resolveAllergenId,
  serializeProfileAllergenIds,
} from './profile-allergens';

describe('resolveAllergenId', () => {
  it('resolves canonical id', () => {
    expect(resolveAllergenId('milk')).toBe('milk');
  });

  it('resolves legacy Russian label', () => {
    expect(resolveAllergenId('Молоко')).toBe('milk');
    expect(resolveAllergenId('Арахис')).toBe('peanut');
    expect(resolveAllergenId('Пыль клещей')).toBe('dust-mites');
  });
});

describe('parseProfileAllergenIds', () => {
  it('migrates legacy labels to ids', () => {
    expect(parseProfileAllergenIds('["Молоко","Арахис"]')).toEqual(['milk', 'peanut']);
  });

  it('keeps canonical ids', () => {
    expect(parseProfileAllergenIds('["milk","birch-pollen"]')).toEqual(['milk', 'birch-pollen']);
  });

  it('deduplicates', () => {
    expect(parseProfileAllergenIds('["Молоко","milk"]')).toEqual(['milk']);
  });

  it('returns empty on invalid json', () => {
    expect(parseProfileAllergenIds('not-json')).toEqual([]);
  });
});

describe('parseAllergies', () => {
  it('returns display names from ids', () => {
    expect(parseAllergies('["milk","peanut"]')).toEqual(['Молоко', 'Арахис']);
  });
});

describe('serializeProfileAllergenIds', () => {
  it('stores only valid ids', () => {
    expect(serializeProfileAllergenIds(['milk', 'unknown', 'Молоко'])).toBe('["milk"]');
  });
});

describe('migrateProfileAllergiesJson', () => {
  it('rewrites legacy storage', () => {
    expect(migrateProfileAllergiesJson('["Молоко"]')).toBe('["milk"]');
  });
});

describe('profileHasPollenAllergen', () => {
  it('matches by canonical pollen id', () => {
    expect(profileHasPollenAllergen(['birch-pollen', 'milk'], 'birch-pollen')).toBe(true);
    expect(profileHasPollenAllergen(['milk'], 'birch-pollen')).toBe(false);
  });
});
