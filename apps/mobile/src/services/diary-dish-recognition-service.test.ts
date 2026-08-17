import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recognizeDiaryDish } from '@/src/services/diary-dish-recognition-service';
import { enrichDishFromOpenFoods } from '@/src/services/dish-off-enrichment-service';
import { lookupDishIngredientsForScan } from '@/src/services/scanner-dish-lookup-service';

vi.mock('@/src/services/scanner-dish-lookup-service', () => ({
  lookupDishIngredientsForScan: vi.fn(),
}));

vi.mock('@/src/services/dish-off-enrichment-service', () => ({
  enrichDishFromOpenFoods: vi.fn(),
}));

describe('recognizeDiaryDish', () => {
  beforeEach(() => {
    vi.mocked(lookupDishIngredientsForScan).mockReset();
    vi.mocked(enrichDishFromOpenFoods).mockReset();
  });

  it('returns scanner lookup enrichment for a typed dish name', async () => {
    vi.mocked(lookupDishIngredientsForScan).mockResolvedValue({
      query: 'борщ',
      productName: 'Борщ',
      ingredients: 'свекла, капуста, говядина',
      declaredAllergenIds: [],
      traceAllergenIds: [],
      source: 'ocr',
      enrichment: {
        components: [
          { id: 'beet', nameRu: 'свекла' },
          { id: 'cabbage', nameRu: 'капуста' },
        ],
        dishId: 'borscht',
        dishName: 'Борщ',
        source: 'local',
      },
    });

    const result = await recognizeDiaryDish('борщ');
    expect(result?.dishName).toBe('Борщ');
    expect(result?.components.map((item) => item.id)).toEqual(['beet', 'cabbage']);
    expect(enrichDishFromOpenFoods).not.toHaveBeenCalled();
  });

  it('builds a checklist from a spoken-style ingredient string when catalog misses', async () => {
    vi.mocked(lookupDishIngredientsForScan).mockResolvedValue({
      query: 'цезарь',
      productName: 'Салат Цезарь',
      ingredients: 'курица, салат, сыр, яйца',
      declaredAllergenIds: ['eggs'],
      traceAllergenIds: [],
      source: 'ocr',
    });

    const result = await recognizeDiaryDish('цезарь');
    expect(result?.dishName).toBe('Салат Цезарь');
    expect(result?.components.length).toBeGreaterThan(0);
    expect(result?.components.some((item) => item.allergenId === 'eggs' || /яйц/i.test(item.nameRu))).toBe(
      true,
    );
  });

  it('falls back to local/OFF enrichment when scanner lookup is empty', async () => {
    vi.mocked(lookupDishIngredientsForScan).mockResolvedValue(null);
    vi.mocked(enrichDishFromOpenFoods).mockResolvedValue({
      components: [{ id: 'milk', nameRu: 'молоко', allergenId: 'milk' }],
      dishId: 'milk',
      dishName: 'Молоко',
      source: 'local',
    });

    const result = await recognizeDiaryDish('молоко');
    expect(result?.dishName).toBe('Молоко');
    expect(enrichDishFromOpenFoods).toHaveBeenCalledWith('молоко');
  });
});
