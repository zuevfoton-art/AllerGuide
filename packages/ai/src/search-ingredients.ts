/**
 * Helpers for Yandex Search → ingredient text (option C).
 * HTTP lives in apps/api; this package only shapes/parses text.
 */

const COMPOSITION_HINT =
  /состав[:\s]|ингредиент|ingredients|composition|действующ|включает|из\s+|рецепт[:\s]/i;

const ALLERGEN_HINT =
  /молоко|яйц|глютен|пшениц|арахис|орех|со[яи]|рыб|морепроду|сельдерей|горчиц|кунжут|сульфит/i;

export function buildIngredientsSearchQuery(productQuery: string): string {
  const q = productQuery.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!q) return '';
  // Prefer passages that list edible ingredients (not restaurant ads / calories).
  return `состав ингредиенты блюда или продукта «${q}» список компонентов без рекламы`;
}

/**
 * Pick the best composition-like passage from search snippets / gen-answer.
 */
export function extractIngredientsFromSearchTexts(texts: string[]): string {
  const cleaned = texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (cleaned.length === 0) return '';

  const scored = cleaned
    .map((text) => ({ text, score: scoreIngredientPassage(text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored[0]) return stripSearchBoilerplate(scored[0].text);

  const longest = [...cleaned].sort((a, b) => b.length - a.length)[0] ?? '';
  return longest.length >= 20 ? stripSearchBoilerplate(longest) : '';
}

function scoreIngredientPassage(text: string): number {
  if (text.length < 24) return 0;
  let score = 0;
  if (COMPOSITION_HINT.test(text)) score += 4;
  if (ALLERGEN_HINT.test(text)) score += 2;
  if ((text.match(/,/g) ?? []).length >= 2) score += 2;
  if (text.length >= 80) score += 1;
  if (/купить|доставк|скидк|₽|руб\./i.test(text)) score -= 3;
  return score;
}

function stripSearchBoilerplate(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}
