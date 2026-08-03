import { describe, expect, it } from 'vitest';
import { resolveMatchAliasKeyword } from './scan-match-display';

describe('resolveMatchAliasKeyword', () => {
  it('returns a keyword that differs from the allergen name when present in text', () => {
    expect(resolveMatchAliasKeyword('milk', 'Молоко', 'состав: казеин, сахар')).toBe('казеин');
  });

  it('returns null when only the allergen name appears', () => {
    expect(resolveMatchAliasKeyword('milk', 'Молоко', 'молоко цельное')).toBeNull();
  });

  it('returns null without allergen id or text', () => {
    expect(resolveMatchAliasKeyword(undefined, 'Молоко', 'казеин')).toBeNull();
    expect(resolveMatchAliasKeyword('milk', 'Молоко', '')).toBeNull();
  });
});
