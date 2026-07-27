const MAX_QUERY_CHARS = 80;
const COMPOSITION_HEADER = /^(состав|ингредиенты|ingredients|composition)(?:\s*[:：]|\s+|$)/i;
const DISH_HEADER = /^(блюдо|dish|product|продукт)\s*[:：-]?\s*/i;

/**
 * Turn OCR text into a short dish/product name for Open Food Facts / local dish search.
 * Returns '' when the text looks like a raw ingredients list without a dish title.
 */
export function extractDishSearchQuery(ocrText: string): string {
  const lines = ocrText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) return '';

  const titled = lines.find((line) => DISH_HEADER.test(line));
  if (titled) {
    return clampQuery(titled.replace(DISH_HEADER, '').trim());
  }

  const first = lines[0];
  if (COMPOSITION_HEADER.test(first)) {
    return '';
  }

  return clampQuery(first.replace(DISH_HEADER, '').trim());
}

function clampQuery(candidate: string): string {
  if (!candidate) return '';

  if (candidate.length > MAX_QUERY_CHARS) {
    const beforeComma = candidate.split(',')[0]?.trim() ?? candidate;
    if (beforeComma.length >= 2 && beforeComma.length <= MAX_QUERY_CHARS) {
      return beforeComma;
    }
    return candidate.split(/\s+/).slice(0, 6).join(' ').slice(0, MAX_QUERY_CHARS);
  }

  // Long comma-separated ingredient dump without a title — not a dish name.
  if ((candidate.match(/,/g) ?? []).length >= 3) {
    return candidate.split(',')[0]?.trim() ?? '';
  }

  return candidate;
}
