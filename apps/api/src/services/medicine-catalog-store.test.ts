import { describe, expect, it } from 'vitest';
import {
  escapeIlike,
  medicineSearchTerms,
  storedMedicineBarcode,
  MEDICINE_TRGM_SIMILARITY_THRESHOLD,
} from './medicine-catalog-store';

describe('medicine catalog search terms', () => {
  it('escapes ILIKE wildcards so a typed percent is literal', () => {
    expect(escapeIlike('10%')).toBe('10\\%');
    expect(escapeIlike('foo_bar')).toBe('foo\\_bar');
  });

  it('builds prefix and contains patterns from a normalized query', () => {
    const terms = medicineSearchTerms('Кларетин');
    expect(terms.normalized).toBe('кларетин');
    expect(terms.contains).toBe('%Кларетин%');
    expect(terms.prefix).toBe('Кларетин%');
    expect(terms.normalizedPrefix).toBe('кларетин%');
  });

  it('keeps the trigram fallback above accidental single-letter noise', () => {
    expect(MEDICINE_TRGM_SIMILARITY_THRESHOLD).toBeGreaterThanOrEqual(0.3);
  });
});

describe('storedMedicineBarcode', () => {
  it('stores a normalized GTIN and rejects short or blank codes', () => {
    expect(storedMedicineBarcode({ barcode: '4013 0540 02508' })).toBe('4013054002508');
    expect(storedMedicineBarcode({ barcode: '123' })).toBeNull();
    expect(storedMedicineBarcode({ barcode: '   ' })).toBeNull();
    expect(storedMedicineBarcode({ barcode: undefined })).toBeNull();
  });

  it('keeps the existing pack code when the later card has none', () => {
    expect(storedMedicineBarcode({ barcode: '' }, '4013054002508')).toBe('4013054002508');
    expect(storedMedicineBarcode({ barcode: 'abc' }, '4013054002508')).toBe('4013054002508');
  });

  it('does not store empty strings, so several packs without a GTIN stay unique', () => {
    expect(storedMedicineBarcode({ barcode: '' }, '')).toBeNull();
    expect(storedMedicineBarcode({ barcode: '' }, null)).toBeNull();
  });
});
