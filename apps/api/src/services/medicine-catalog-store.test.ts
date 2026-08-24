import { describe, expect, it } from 'vitest';
import { escapeIlike, medicineSearchTerms, MEDICINE_TRGM_SIMILARITY_THRESHOLD } from './medicine-catalog-store';

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
