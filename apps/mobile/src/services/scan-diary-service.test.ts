import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanResultExtended } from '@/src/services/scan-analysis';
import {
  buildScanDiaryDraft,
  resolveScanDiarySection,
  saveScanDiaryEntry,
  scanModeFromProductCategory,
  SCAN_DIARY_SECTION_TYPE,
} from '@/src/services/scan-diary-service';
import { addDiaryEntries } from '@/src/services/diary-service';
import { trackEvent } from '@/src/services/analytics-service';

vi.mock('@/src/services/diary-service', () => ({
  addDiaryEntries: vi.fn(),
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/src/services/reminder-reconcile-service', () => ({
  reconcileAllReminders: vi.fn(async () => undefined),
}));

function scanResult(overrides: Partial<ScanResultExtended> = {}): ScanResultExtended {
  return {
    verdict: 'Опасно',
    reason: 'Найдено молоко',
    matches: ['Молоко'],
    crossMatches: [],
    mode: 'product',
    level: 'high',
    source: 'openfoodfacts',
    ...overrides,
  };
}

describe('buildScanDiaryDraft', () => {
  it('maps a barcode product scan onto the nutrition draft', () => {
    const draft = buildScanDiaryDraft({
      result: scanResult({
        productName: 'Йогурт Activia',
        productIngredients: 'молоко, сахар, закваска',
        structuredMatches: [
          { kind: 'direct', allergenId: 'milk', label: 'Молоко', confidence: 'high' },
        ],
      }),
      scanText: '4601234567890',
    });

    expect(draft.dish.food).toBe('Йогурт Activia');
    expect(draft.dish.productBarcode).toBe('4601234567890');
    expect(draft.dish.components.length).toBeGreaterThan(0);
    expect(draft.dish.components.some((item) => item.allergenId === 'milk')).toBe(true);
    expect(draft.scanRef.verdict).toBe('Опасно');
    expect(draft.scanRef.level).toBe('high');
    expect(draft.initialStepId).toBe('reaction');
  });

  it('uses the dish-vision name and its likely ingredients', () => {
    const draft = buildScanDiaryDraft({
      result: scanResult({
        productName: 'Продукт (OCR)',
        source: 'dish_vision',
        dishVision: {
          dishName: 'Оливье',
          ingredients: ['картофель', 'яйцо', 'майонез'],
          confidence: 'medium',
        } as ScanResultExtended['dishVision'],
      }),
      scanText: '',
    });

    expect(draft.dish.food).toBe('Оливье');
    expect(draft.dish.components.length).toBeGreaterThan(0);
    expect(draft.initialStepId).toBe('reaction');
  });

  it('takes the title before the composition marker as the dish name', () => {
    const scanText = 'Шоколад молочный. Состав: сахар, молоко сухое цельное, лецитин соевый.';
    const draft = buildScanDiaryDraft({
      result: scanResult({
        productName: 'Продукт (OCR)',
        // Manual / OCR scans keep the title in `text` and strip it from `ingredientsBlock`.
        ocr: {
          text: scanText,
          ingredientsBlock: 'сахар, молоко сухое цельное, лецитин соевый.',
          source: 'manual',
          warnings: [],
        },
      }),
      scanText,
    });

    expect(draft.dish.food).toBe('Шоколад молочный');
    expect(draft.initialStepId).toBe('reaction');
    expect(draft.dish.components.some((item) => item.allergenId === 'milk')).toBe(true);
  });

  it('does not mine a name out of a composition-only OCR block', () => {
    const ingredientsBlock = 'сахар, молоко сухое цельное, какао-масло, лецитин соевый.';
    const draft = buildScanDiaryDraft({
      result: scanResult({
        productName: 'Продукт (OCR)',
        source: 'ocr',
        ocr: { text: ingredientsBlock, ingredientsBlock, source: 'normalized', warnings: [] },
      }),
      scanText: '',
    });

    expect(draft.dish.food).toBe('');
    expect(draft.initialStepId).toBe('food');
    expect(draft.dish.components.some((item) => item.allergenId === 'milk')).toBe(true);
  });

  it('asks for the dish name when the scan only produced a composition list', () => {
    const draft = buildScanDiaryDraft({
      result: scanResult({ productName: 'Продукт (OCR)' }),
      scanText: 'Состав: молоко, сахар, какао-масло, лецитин соевый',
    });

    expect(draft.dish.food).toBe('');
    expect(draft.initialStepId).toBe('food');
    expect(draft.dish.components.length).toBeGreaterThan(0);
  });

  it('reads allergen labels when a history entry has no structured matches', () => {
    const draft = buildScanDiaryDraft({
      result: scanResult({
        productName: 'Печенье',
        productIngredients: 'пшеничная мука, сахар',
        matches: ['Молоко'],
        traceMatches: ['Орехи'],
      }),
      scanText: 'Печенье',
    });

    const allergenIds = draft.dish.components
      .map((item) => item.allergenId)
      .filter((id): id is string => Boolean(id));
    expect(allergenIds).toContain('milk');
    expect(allergenIds).toContain('tree-nuts');
  });
});

describe('resolveScanDiarySection', () => {
  it('routes medicine scans to the medicine diary section', () => {
    expect(resolveScanDiarySection({ mode: 'medicine' })).toBe('Лекарство');
    expect(resolveScanDiarySection({ productCategory: 'medicine' })).toBe('Лекарство');
  });

  it('routes cosmetics and household products to the trigger section', () => {
    expect(resolveScanDiarySection({ productCategory: 'beauty' })).toBe('Триггер');
    expect(resolveScanDiarySection({ productCategory: 'household' })).toBe('Триггер');
    expect(resolveScanDiarySection({ mode: 'cosmetics' })).toBe('Триггер');
    expect(resolveScanDiarySection({ source: 'openbeautyfacts' })).toBe('Триггер');
  });

  it('keeps food and unknown scans in nutrition', () => {
    expect(resolveScanDiarySection({ productCategory: 'food' })).toBe('Питание');
    expect(resolveScanDiarySection({})).toBe(SCAN_DIARY_SECTION_TYPE);
  });

  it('maps OFF categories onto analysis modes', () => {
    expect(scanModeFromProductCategory('food')).toBe('product');
    expect(scanModeFromProductCategory('beauty')).toBe('cosmetics');
    expect(scanModeFromProductCategory('household')).toBe('cosmetics');
    expect(scanModeFromProductCategory('medicine')).toBe('medicine');
  });
});

describe('saveScanDiaryEntry', () => {
  beforeEach(() => {
    vi.mocked(addDiaryEntries).mockReset();
    vi.mocked(trackEvent).mockReset();
  });

  it('tracks the scan → diary funnel step after a successful write', async () => {
    vi.mocked(addDiaryEntries).mockResolvedValue([{ ok: true, entryId: 12 }]);

    const saved = await saveScanDiaryEntry({
      profileId: 7,
      entries: [{ type: SCAN_DIARY_SECTION_TYPE, details: '{"v":1,"answers":{}}' }],
      level: 'high',
      source: 'openfoodfacts',
    });

    expect(saved).toEqual({ ok: true, entryId: 12 });
    expect(trackEvent).toHaveBeenCalledWith('scan_saved_to_diary', {
      risk_level: 'high',
      scan_source: 'openfoodfacts',
    });
  });

  it('propagates the write error without tracking', async () => {
    vi.mocked(addDiaryEntries).mockResolvedValue([{ ok: false, code: 'profile_not_found' }]);

    const saved = await saveScanDiaryEntry({
      profileId: 7,
      entries: [{ type: SCAN_DIARY_SECTION_TYPE, details: '{"v":1,"answers":{}}' }],
      level: 'low',
    });

    expect(saved).toEqual({ ok: false, code: 'profile_not_found' });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
