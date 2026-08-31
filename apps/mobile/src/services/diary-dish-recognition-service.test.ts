import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recognizeDiaryDish,
  recognizeDiaryDishFromBarcode,
  recognizeDiaryDishFromPhoto,
} from '@/src/services/diary-dish-recognition-service';
import { enrichDishFromOpenFoods } from '@/src/services/dish-off-enrichment-service';
import { lookupDishIngredientsForScan } from '@/src/services/scanner-dish-lookup-service';
import { scanFromOcr } from '@/src/services/scanner-ocr-service';
import { resolveProductByBarcode } from '@/src/services/barcode-lookup-service';

vi.mock('@/src/services/scanner-dish-lookup-service', () => ({
  lookupDishIngredientsForScan: vi.fn(),
}));

vi.mock('@/src/services/scanner-ocr-service', () => ({
  scanFromOcr: vi.fn(),
}));

vi.mock('@/src/services/dish-off-enrichment-service', () => ({
  enrichDishFromOpenFoods: vi.fn(),
}));

vi.mock('@/src/services/barcode-lookup-service', () => ({
  resolveProductByBarcode: vi.fn(),
}));

describe('recognizeDiaryDish', () => {
  beforeEach(() => {
    vi.mocked(lookupDishIngredientsForScan).mockReset();
    vi.mocked(enrichDishFromOpenFoods).mockReset();
    vi.mocked(scanFromOcr).mockReset();
    vi.mocked(resolveProductByBarcode).mockReset();
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

  it('uses scanner OCR/VL product name then the same dish lookup', async () => {
    vi.mocked(scanFromOcr).mockResolvedValue({
      productName: 'борщ',
      ocr: { text: 'борщ', source: 'cloud', warnings: [] },
    } as never);
    vi.mocked(lookupDishIngredientsForScan).mockResolvedValue({
      query: 'борщ',
      productName: 'Борщ',
      ingredients: 'свекла',
      declaredAllergenIds: [],
      traceAllergenIds: [],
      source: 'ocr',
      enrichment: {
        components: [{ id: 'beet', nameRu: 'свекла' }],
        dishId: 'borscht',
        dishName: 'Борщ',
        source: 'local',
      },
    });

    const result = await recognizeDiaryDishFromPhoto({ imageBase64: 'abc' });
    expect(result?.food).toBe('Борщ');
    expect(result?.enrichment.components[0]?.id).toBe('beet');
    expect(scanFromOcr).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'product', imageBase64: 'abc' }),
    );
  });

  it('builds a checklist from OCR text when the photo has no product name', async () => {
    vi.mocked(scanFromOcr).mockResolvedValue({
      productName: '',
      ocr: { text: 'борщ, свекла, капуста', source: 'cloud', warnings: [] },
    } as never);
    vi.mocked(lookupDishIngredientsForScan).mockResolvedValue(null);
    vi.mocked(enrichDishFromOpenFoods).mockResolvedValue(null);

    const result = await recognizeDiaryDishFromPhoto({ imageBase64: 'xyz' });
    expect(result?.food).toMatch(/борщ/i);
    expect(result?.enrichment.components.length).toBeGreaterThan(0);
  });
});

describe('recognizeDiaryDishFromBarcode', () => {
  beforeEach(() => {
    vi.mocked(resolveProductByBarcode).mockReset();
  });

  it('returns null for a short or empty barcode', async () => {
    expect(await recognizeDiaryDishFromBarcode('123')).toBeNull();
    expect(await recognizeDiaryDishFromBarcode('')).toBeNull();
    expect(resolveProductByBarcode).not.toHaveBeenCalled();
  });

  it('returns null when catalog/OFF miss the barcode', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue(null);
    expect(await recognizeDiaryDishFromBarcode('4601234567890')).toBeNull();
  });

  it('builds a dish checklist from the scanned product', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue({
      barcode: '4601234567890',
      name: 'Молоко 3.2%',
      ingredients: 'молоко цельное, сливки',
      brand: 'Домик',
      source: 'openfoodfacts',
      declaredAllergenIds: ['milk'],
      traceAllergenIds: [],
    });

    const result = await recognizeDiaryDishFromBarcode('4601234567890');
    expect(result?.food).toBe('Молоко 3.2%');
    expect(result?.enrichment.productBarcode).toBe('4601234567890');
    expect(result?.enrichment.source).toBe('openfoodfacts');
    expect(result?.enrichment.components.some((item) => item.allergenId === 'milk' || /молок/i.test(item.nameRu))).toBe(
      true,
    );
  });
});
