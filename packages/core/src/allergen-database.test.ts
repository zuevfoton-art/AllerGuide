import { describe, expect, it } from 'vitest';
import {
  ALLERGENS,
  buildAllergenKeywordsMap,
  compareCrossReactionRisk,
  CROSS_REACTIONS,
  findAllergenByName,
  getAllergensByCategory,
  getCrossReactionsFor,
  getCrossReactionsForSelection,
  getPopularAllergens,
} from './allergens';

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
  'Пылевые клещи',
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
    expect(matches.find((item) => item.allergen.name === 'Яблоко')?.risk).toBe('high');
  });

  it('suggests related allergens not yet selected', () => {
    const suggestions = getCrossReactionsForSelection(['Латекс']);
    expect(suggestions.some((item) => item.allergen.name === 'Банан')).toBe(true);
    expect(suggestions.some((item) => item.allergen.name === 'Киви')).toBe(true);
  });

  it('includes phase-1 high-risk cross reactions', () => {
    const dustMites = findAllergenByName('Пылевые клещи');
    expect(dustMites).toBeDefined();
    const matches = getCrossReactionsFor(dustMites!.id);
    const seafood = matches.find((item) => item.allergen.name === 'Морепродукты');
    expect(seafood).toBeDefined();
    expect(seafood?.risk).toBe('high');
    expect(seafood?.protein).toBe('Der p 10');
  });

  it('keeps the highest risk when multiple triggers point to the same allergen', () => {
    const suggestions = getCrossReactionsForSelection(['Пыльца берёзы', 'Арахис']);
    const soy = suggestions.find((item) => item.allergen.name === 'Соя');
    expect(soy?.risk).toBe('medium');
  });

  it('sorts cross-reaction suggestions by risk', () => {
    const birch = findAllergenByName('Пыльца берёзы');
    const matches = getCrossReactionsFor(birch!.id);
    for (let index = 1; index < matches.length; index += 1) {
      expect(compareCrossReactionRisk(matches[index - 1].risk, matches[index].risk)).toBeLessThanOrEqual(0);
    }
  });

  it('builds keyword map for scanner compatibility', () => {
    const keywords = buildAllergenKeywordsMap();
    expect(keywords['молоко']).toContain('лактоза');
    expect(keywords['арахис']).toContain('арахис');
    expect(keywords['пшеница / глютен']).toContain('глютен');
  });

  it('ships phase-1 cross-reaction coverage', () => {
    expect(CROSS_REACTIONS.length).toBeGreaterThanOrEqual(40);
  });

  it('includes phase-2 pollen and food cross reactions', () => {
    const mugwort = findAllergenByName('Пыльца полыни');
    expect(mugwort).toBeDefined();
    const mugwortMatches = getCrossReactionsFor(mugwort!.id);
    expect(mugwortMatches.some((item) => item.allergen.name === 'Сельдерей')).toBe(true);
    expect(mugwortMatches.find((item) => item.allergen.name === 'Сельдерей')?.risk).toBe('high');

    const grass = findAllergenByName('Пыльца злаков');
    expect(grass).toBeDefined();
    const grassMatches = getCrossReactionsFor(grass!.id);
    expect(grassMatches.some((item) => item.allergen.name === 'Томаты')).toBe(true);

    const wheat = findAllergenByName('Пшеница / глютен');
    const rye = getCrossReactionsFor(wheat!.id).find((item) => item.allergen.name === 'Рожь');
    expect(rye?.risk).toBe('high');

    const fish = findAllergenByName('Рыба');
    const otherFish = getCrossReactionsFor(fish!.id).find(
      (item) => item.allergen.name === 'Другие виды рыб',
    );
    expect(otherFish?.risk).toBe('high');
  });

  it('prefers higher tomato risk when birch and grass pollen are selected', () => {
    const suggestions = getCrossReactionsForSelection(['Пыльца берёзы', 'Пыльца злаков']);
    const tomato = suggestions.find((item) => item.allergen.name === 'Томаты');
    expect(tomato?.risk).toBe('medium');
  });
});
