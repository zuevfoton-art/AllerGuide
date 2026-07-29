/**
 * Helpers for Yandex Search → ingredient text (option C).
 * HTTP lives in apps/api; this package only shapes/parses text.
 */

const COMPOSITION_HINT =
  /состав[:\s]|ингредиент|ingredients|composition|действующ|включает|из\s+/i;

export function buildIngredientsSearchQuery(productQuery: string): string {
  const q = productQuery.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!q) return '';
  return `состав ингредиенты ${q}`;
}

/**
 * Pick the best composition-like passage from search snippets / gen-answer.
 */
export function extractIngredientsFromSearchTexts(texts: string[]): string {
  const cleaned = texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (cleaned.length === 0) return '';

  const withHint = cleaned.find((t) => COMPOSITION_HINT.test(t) && t.length >= 24);
  if (withHint) return stripSearchBoilerplate(withHint);

  const longest = [...cleaned].sort((a, b) => b.length - a.length)[0] ?? '';
  return longest.length >= 20 ? stripSearchBoilerplate(longest) : '';
}

function stripSearchBoilerplate(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}
