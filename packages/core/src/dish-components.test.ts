import { describe, expect, it } from 'vitest';
import {
  DISH_CATALOG,
  applyDishBreakdownToAnswers,
  buildComponentsFromProduct,
  buildDishBreakdown,
  enrichLocalComponentsWithProduct,
  findDishMatches,
  findDishRecipe,
  parseSelectedComponentIds,
  resolveDishComponents,
  resolveSelectedIdsForEnrichment,
  serializeSelectedComponentIds,
} from './dish-components';

describe('dish-components', () => {
  it('ships a starter catalog of common dishes', () => {
    expect(DISH_CATALOG.length).toBeGreaterThanOrEqual(30);
  });

  it('resolves borscht components including beet and cabbage', () => {
    const recipe = findDishRecipe('Съел борщ на обед');
    expect(recipe?.id).toBe('borscht');
    const ids = resolveDishComponents('борщ').map((item) => item.id);
    expect(ids).toContain('beet');
    expect(ids).toContain('cabbage');
    expect(ids).toContain('potato');
  });

  it('marks direct profile conflicts for selected components', () => {
    const breakdown = buildDishBreakdown('борщ', ['carrot', 'beef']);
    const carrot = breakdown.components.find((item) => item.id === 'carrot');
    const beet = breakdown.components.find((item) => item.id === 'beet');
    expect(carrot?.conflict).toBe('direct');
    expect(beet?.conflict).toBeNull();
    expect(breakdown.conflictsSummary.toLowerCase()).toContain('морков');
  });

  it('allows deselecting components and updates allergen summary', () => {
    const all = resolveDishComponents('борщ').map((item) => item.id);
    const withoutBeet = all.filter((id) => id !== 'beet');
    const breakdown = buildDishBreakdown('борщ', [], withoutBeet);
    expect(breakdown.allergensSummary).not.toContain('свёкла');
    expect(breakdown.components.find((item) => item.id === 'beet')?.selected).toBe(false);
  });

  it('applies breakdown into diary answers', () => {
    const next = applyDishBreakdownToAnswers({ food: 'омлет' }, ['eggs']);
    expect(next.foodDishId).toBe('omelette');
    expect(parseSelectedComponentIds(next.foodComponents).length).toBeGreaterThan(0);
    expect(next.allergens.toLowerCase()).toContain('яйц');
    expect(next.foodComponentConflicts.toLowerCase()).toContain('яйц');
  });

  it('serializes selected component ids as JSON', () => {
    expect(serializeSelectedComponentIds(['a', 'b'])).toBe('["a","b"]');
    expect(parseSelectedComponentIds('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns empty components for unknown dishes', () => {
    expect(resolveDishComponents('неизвестное блюдо xyz')).toEqual([]);
    expect(findDishRecipe('неизвестное блюдо xyz')).toBeNull();
  });

  it('matches every catalog name back to its recipe', () => {
    for (const recipe of DISH_CATALOG) {
      for (const name of recipe.names) {
        expect(findDishRecipe(name)?.id, name).toBe(recipe.id);
      }
    }
  });

  it('tolerates typos, declension, and filler around known names', () => {
    expect(findDishRecipe('карбонора')?.id).toBe('carbonara');
    expect(findDishRecipe('оливьэ')?.id).toBe('olivier');
    expect(findDishRecipe('лазання')?.id).toBe('lasagna');
    expect(findDishRecipe('пельменей')?.id).toBe('pelmeni');
    expect(findDishRecipe('котлету')?.id).toBe('kotleti');
    expect(findDishRecipe('Съел борщ на обед')?.id).toBe('borscht');
    expect(findDishRecipe('«Оливье» 250 г')?.id).toBe('olivier');
  });

  it('matches Latin queries to Cyrillic catalog names', () => {
    expect(findDishRecipe('lasagna')?.id).toBe('lasagna');
    expect(findDishRecipe('borscht')?.id).toBe('borscht');
    expect(findDishRecipe('plov')?.id).toBe('plov');
    expect(findDishRecipe('carbonara')?.id).toBe('carbonara');
  });

  it('does not collapse short dish names into each other', () => {
    expect(findDishRecipe('щи')?.id).toBe('shchi');
    expect(findDishRecipe('уха')?.id).toBe('fish-soup');
    expect(findDishRecipe('чай')).toBeNull();
  });

  it('returns ranked candidates instead of a single silent pick', () => {
    const matches = findDishMatches('салат', 5);
    expect(matches.length).toBeGreaterThan(1);
    expect(matches.every((item) => item.score >= 40)).toBe(true);
  });

  it('builds components from OFF-style allergen tags and ingredients text', () => {
    const components = buildComponentsFromProduct({
      name: 'Yogurt natural',
      ingredients: 'молоко, сахар, культуры',
      allergenTags: ['en:milk'],
      traceTags: ['en:nuts'],
    });
    const ids = components.map((item) => item.id);
    expect(ids).toContain('milk');
    expect(ids).toContain('tree-nuts');
    expect(ids).toContain('sugar');
  });

  it('enriches a local recipe with OFF product allergens', () => {
    const local = resolveDishComponents('борщ');
    const enriched = enrichLocalComponentsWithProduct(local, {
      allergenTags: ['en:milk', 'en:celery'],
      ingredients: 'свёкла, сельдерей',
    });
    const ids = enriched.map((item) => item.id);
    expect(ids).toContain('beet');
    expect(ids).toContain('celery');
    expect(ids.indexOf('beet')).toBeLessThan(ids.indexOf('celery'));
  });

  it('preserves deselections when enrichment adds new components', () => {
    const next = resolveSelectedIdsForEnrichment(
      ['beet', 'cabbage'],
      ['beet', 'cabbage', 'potato'],
      [
        { id: 'beet', nameRu: 'свёкла' },
        { id: 'cabbage', nameRu: 'капуста' },
        { id: 'potato', nameRu: 'картофель' },
        { id: 'celery', nameRu: 'сельдерей', allergenId: 'celery' },
      ],
    );
    expect(next).toEqual(['beet', 'cabbage', 'celery']);
  });

  it('applies stored component defs so OFF-only dishes survive re-apply', () => {
    const defs = buildComponentsFromProduct({
      allergenTags: ['milk', 'eggs'],
      ingredients: '',
    });
    const first = applyDishBreakdownToAnswers(
      { food: 'йогурт Activia' },
      [],
      { components: defs, dishId: 'off:123', dishName: 'Activia', source: 'openfoodfacts' },
    );
    expect(first.foodOffSource).toBe('openfoodfacts');
    expect(parseSelectedComponentIds(first.foodComponents).length).toBeGreaterThan(0);

    first.foodComponents = serializeSelectedComponentIds(
      parseSelectedComponentIds(first.foodComponents).filter((id) => id !== 'eggs'),
    );
    const second = applyDishBreakdownToAnswers(first, []);
    expect(parseSelectedComponentIds(second.foodComponents)).not.toContain('eggs');
    expect(parseSelectedComponentIds(second.foodComponents)).toContain('milk');
  });
});
