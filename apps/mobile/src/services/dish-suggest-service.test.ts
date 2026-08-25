import { describe, expect, it } from 'vitest';
import { rankLocalDishSuggestions } from '@allerguide/core';

describe('local dish suggestions', () => {
  it('ranks spaghetti bolognese from a typo', () => {
    const hits = rankLocalDishSuggestions('спагетти балоньезе');
    expect(hits[0]?.id).toBe('spaghetti-bolognese');
    expect(hits[0]?.ingredientsPreview).toMatch(/говядина|томат|макарон/i);
  });
});
