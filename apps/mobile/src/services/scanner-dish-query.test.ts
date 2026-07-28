import { describe, expect, it } from 'vitest';
import { extractDishSearchQuery } from '@/src/services/scanner-dish-query';

describe('extractDishSearchQuery', () => {
  it('prefers an explicit dish title line', () => {
    expect(extractDishSearchQuery('Блюдо: оливье\nСостав: картофель, яйца')).toBe('оливье');
  });

  it('returns empty for composition-only OCR without a dish title', () => {
    expect(extractDishSearchQuery('Состав: вода, сахар, молоко')).toBe('');
  });

  it('uses a short first line as the dish/product name', () => {
    expect(extractDishSearchQuery('Паста карбонара\nсливки, сыр')).toBe('Паста карбонара');
  });

  it('shortens long lines to a searchable fragment', () => {
    const long =
      'Паста карбонара со сливками пармезаном беконом и яйцом очень длинное описание блюда для OCR';
    const query = extractDishSearchQuery(long);
    expect(query.length).toBeLessThanOrEqual(80);
    expect(query.toLowerCase()).toContain('паста');
  });

  it('returns empty for blank input', () => {
    expect(extractDishSearchQuery('   ')).toBe('');
  });
});
