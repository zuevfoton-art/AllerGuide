import { describe, expect, it } from 'vitest';
import {
  buildIngredientsSearchQuery,
  extractIngredientsFromSearchTexts,
} from './search-ingredients';

describe('search-ingredients', () => {
  it('builds a composition search query', () => {
    expect(buildIngredientsSearchQuery('оливье')).toBe('состав ингредиенты оливье');
  });

  it('prefers passages that look like ingredient lists', () => {
    const text = extractIngredientsFromSearchTexts([
      'Рецепт на праздник',
      'Состав: картофель, морковь, яйца, майонез, горошек',
      'фото',
    ]);
    expect(text).toContain('картофель');
    expect(text).toContain('майонез');
  });
});
