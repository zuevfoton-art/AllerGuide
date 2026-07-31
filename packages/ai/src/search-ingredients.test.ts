import { describe, expect, it } from 'vitest';
import {
  buildIngredientsSearchQuery,
  extractIngredientsFromSearchTexts,
} from './search-ingredients';

describe('search-ingredients', () => {
  it('builds a composition search query', () => {
    expect(buildIngredientsSearchQuery('оливье')).toContain('оливье');
    expect(buildIngredientsSearchQuery('оливье')).toMatch(/состав|ингредиент/i);
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

  it('downranks ad-like snippets vs composition', () => {
    const text = extractIngredientsFromSearchTexts([
      'Купить оливье со скидкой ₽499 доставка',
      'Состав: картофель, морковь, яйца, майонез, зелёный горошек',
    ]);
    expect(text).toContain('картофель');
    expect(text).not.toMatch(/скидк/i);
  });
});
