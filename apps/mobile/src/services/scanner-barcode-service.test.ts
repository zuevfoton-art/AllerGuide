import { beforeEach, describe, expect, it, vi } from 'vitest';

const featureState = { MEDICINE_DB_ENABLED: false };

vi.mock('@/src/constants/features', () => ({
  get MEDICINE_DB_ENABLED() {
    return featureState.MEDICINE_DB_ENABLED;
  },
}));

vi.mock('@/src/services/barcode-lookup-service', () => ({
  resolveProductByBarcode: vi.fn(),
}));

vi.mock('@/src/services/medicines-api', () => ({
  searchMedicinesFromCatalog: vi.fn(),
}));

vi.mock('@/src/services/scan-history-service', () => ({
  listScanHistory: vi.fn(() => []),
  saveScanHistory: vi.fn(async () => undefined),
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/src/services/scan-analysis', () => ({
  INSUFFICIENT_INGREDIENTS_LENGTH: 15,
  analyzeText: vi.fn(),
}));

import { resolveProductByBarcode } from '@/src/services/barcode-lookup-service';
import { searchMedicinesFromCatalog } from '@/src/services/medicines-api';
import { analyzeText } from '@/src/services/scan-analysis';
import { scanBarcode } from '@/src/services/scanner-barcode-service';

describe('scanBarcode', () => {
  beforeEach(() => {
    featureState.MEDICINE_DB_ENABLED = false;
    vi.mocked(resolveProductByBarcode).mockReset();
    vi.mocked(searchMedicinesFromCatalog).mockReset();
    vi.mocked(analyzeText).mockReset();
  });

  it('does not analyse barcode digits as text on a catalog miss', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue(null);

    const result = await scanBarcode({ barcode: '4607025392138' });

    expect(analyzeText).not.toHaveBeenCalled();
    expect(result.barcodeScanStatus).toBe('not_found');
    expect(result.lookupFailed).toBe(true);
    expect(result.reason).toBe('');
    expect(result.matches).toEqual([]);
  });

  it('extracts GTIN from a GS1 payload before lookup', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue(null);

    await scanBarcode({ barcode: '(01)04607025392138' });

    expect(resolveProductByBarcode).toHaveBeenCalledWith('4607025392138');
  });

  it('passes OFF category into analysis mode', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue({
      barcode: '123',
      name: 'Крем',
      ingredients: 'aqua, parfum',
      source: 'openbeautyfacts',
      declaredAllergenIds: [],
      traceAllergenIds: [],
      category: 'beauty',
    });
    vi.mocked(analyzeText).mockResolvedValue({
      verdict: 'Низкий риск',
      reason: 'ok',
      matches: [],
      crossMatches: [],
      mode: 'cosmetics',
      level: 'low',
      source: 'openbeautyfacts',
    });

    const result = await scanBarcode({ barcode: '12345678' });

    expect(analyzeText).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'cosmetics', productName: 'Крем' }),
    );
    expect(result.productCategory).toBe('beauty');
  });

  it('uses cosmetics analysis for household Open Products Facts hits', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue({
      barcode: '8717644231180',
      name: 'Domestos WC gel',
      ingredients: 'Sodium hypochlorite 4.5%',
      source: 'openproductsfacts',
      declaredAllergenIds: [],
      traceAllergenIds: [],
      category: 'household',
    });
    vi.mocked(analyzeText).mockResolvedValue({
      verdict: 'Низкий риск',
      reason: 'ok',
      matches: [],
      crossMatches: [],
      mode: 'cosmetics',
      level: 'low',
      source: 'openproductsfacts',
    });

    const result = await scanBarcode({ barcode: '8717644231180' });

    expect(analyzeText).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'cosmetics', productName: 'Domestos WC gel' }),
    );
    expect(result.productCategory).toBe('household');
    expect(result.source).toBe('openproductsfacts');
  });

  it('searches the medicine catalog by leftover name after an OFF miss', async () => {
    featureState.MEDICINE_DB_ENABLED = true;
    vi.mocked(resolveProductByBarcode).mockResolvedValue(null);
    vi.mocked(searchMedicinesFromCatalog).mockResolvedValue([
      {
        name: 'Зиртек',
        activeSubstance: 'цетиризин',
        form: '',
        strength: '',
        manufacturer: '',
        indications: '',
        ageUsage: [],
        minAgeYears: null,
        ingredients: 'цетиризин',
        allergenTags: [],
        aliases: [],
        source: 'catalog',
        confidence: 'high',
      },
    ]);
    vi.mocked(analyzeText).mockResolvedValue({
      verdict: 'Низкий риск',
      reason: 'ok',
      matches: [],
      crossMatches: [],
      mode: 'medicine',
      level: 'low',
      source: 'barcode',
    });

    const result = await scanBarcode({ barcode: 'Zyrtec https://id.gs1.org/01/04607025392138' });

    expect(searchMedicinesFromCatalog).toHaveBeenCalledWith('Zyrtec');
    expect(analyzeText).toHaveBeenCalledWith(expect.objectContaining({ mode: 'medicine' }));
    expect(result.productCategory).toBe('medicine');
  });
});
