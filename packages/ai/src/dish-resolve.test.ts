import { describe, expect, it } from 'vitest';
import { parseDishResolveLlm } from './dish-resolve';

describe('parseDishResolveLlm', () => {
  it('accepts a structured payload and drops unknown component ids', () => {
    const parsed = parseDishResolveLlm(
      '{"canonicalName":"спагетти болоньезе","kind":"dish","ingredients":["pasta","beef","unicorn"],"allergenHints":["wheat-gluten"]}',
    );
    expect(parsed?.canonicalName).toBe('спагетти болоньезе');
    expect(parsed?.ingredients).toEqual(['pasta', 'beef']);
    expect(parsed?.allergenHints).toEqual(['wheat-gluten']);
  });

  it('returns null for empty or invalid output', () => {
    expect(parseDishResolveLlm('not json')).toBeNull();
    expect(parseDishResolveLlm('{"canonicalName":""}')).toBeNull();
  });
});
