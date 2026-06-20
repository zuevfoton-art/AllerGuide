import { describe, expect, it } from 'vitest';
import {
  ALLERGENS,
  buildAllergenKeywordsMap,
  findAllergenByName,
  getAllergensByCategory,
  getCrossReactionsFor,
  getCrossReactionsForSelection,
  getPopularAllergens,
} from './allergen-database';

const LEGACY_ALLERGEN_NAMES = [
  'Молоко',
  'Яйца',
  'Арахис',
  'Орехи',
  'Рыба',
  'Морепродукты',
  'Пшеница / глютен',
  'Соя',
  'Кунжут',
  'Пыльца берёзы',
  'Пыльца амброзии',
  'Пыль клещей',
  'Шерсть кошек',
  'Шерсть собак',
  'Пенициллин',
  'Аспирин',
];

describe('allergen database', () => {
  it('keeps all legacy allergen names', () => {
    const names = ALLERGENS.map((item) => item.name);
    for (const legacyName of LEGACY_ALLERGEN_NAMES) {
      expect(names).toContain(legacyName);
    }
  });

  it('returns popular allergens for quick profile selection', () => {
    const popular = getPopularAllergens();
    expect(popular.length).toBeGreaterThanOrEqual(8);
    expect(popular.some((item) => item.name === 'Молоко')).toBe(true);
    expect(popular.some((item) => item.name === LEGACY_ALLERGEN_NAMES[9])).toBe(true);
  });

  it('groups allergens by category', () => {
    const food = getAllergensByCategory('food');
    const environmental = getAllergensByCategory('environmental');
    expect(food.some((item) => item.name === 'Молоко')).toBe(true);
    expect(environmental.some((item) => item.name === LEGACY_ALLERGEN_NAMES[9])).toBe(true);
  });

  it('finds cross-reactions for birch pollen', () => {
    const birch = findAllergenByName(LEGACY_ALLERGEN_NAMES[9]);
    expect(birch).toBeDefined();
    const matches = getCrossReactionsFor(birch!.id);
    expect(matches.some((item) => item.allergen.name === 'Яблоко')).toBe(true);
    expect(matches.some((item) => item.allergen.name === 'Морковь')).toBe(true);
  });

  it('suggests related allergens not yet selected', () => {
    const suggestions = getCrossReactionsForSelection(['Латекс']);
    expect(suggestions.some((item) => item.allergen.name === 'Банан')).toBe(true);
    expect(suggestions.some((item) => item.allergen.name === 'Киви')).toBe(true);
  });

  it('builds keyword map for scanner compatibility', () => {
    const keywords = buildAllergenKeywordsMap();
    expect(keywords['молоко']).toContain('лактоза');
    expect(keywords['арахис']).toContain('арахис');
    expect(keywords['пшеница / глютен']).toContain('глютен');
  });
});
