import { describe, expect, it } from 'vitest';
import {
  DISH_CATALOG,
  applyDishBreakdownToAnswers,
  buildDishBreakdown,
  findDishRecipe,
  parseSelectedComponentIds,
  resolveDishComponents,
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
});
