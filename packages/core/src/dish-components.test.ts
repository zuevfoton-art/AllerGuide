import { describe, expect, it } from 'vitest';
import {
  DISH_CATALOG,
  applyDishBreakdownToAnswers,
  buildComponentsFromProduct,
  buildDishBreakdown,
  enrichLocalComponentsWithProduct,
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
