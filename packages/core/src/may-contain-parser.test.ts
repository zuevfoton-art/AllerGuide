import { describe, expect, it } from 'vitest';
import {
  extractMayContainTerms,
  parseMayContainSegments,
  stripMayContainPhrases,
} from './may-contain-parser';

describe('may-contain-parser', () => {
  it('parses Russian may-contain phrasing', () => {
    const text = 'Состав: сахар, какао. Может содержать молоко, сою и орехи.';
    const segments = parseMayContainSegments(text);
    expect(segments.length).toBeGreaterThan(0);
    expect(extractMayContainTerms(text)).toEqual(
      expect.arrayContaining(['молоко', 'сою', 'орехи']),
    );
  });

  it('parses English traces phrasing', () => {
    const text = 'Ingredients: rice. May contain traces of peanuts and tree nuts.';
    expect(extractMayContainTerms(text)).toEqual(
      expect.arrayContaining(['peanuts', 'tree nuts']),
    );
  });

  it('strips may-contain phrases from declared ingredient text', () => {
    const text = 'water, salt. May contain soy.';
    expect(stripMayContainPhrases(text)).toBe('water, salt.');
  });
});
