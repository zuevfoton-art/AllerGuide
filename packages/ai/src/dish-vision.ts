/**
 * Domain helpers for dish photo vision (calorie-app style):
 * image → dish name + likely ingredients JSON → allergen scan text.
 * HTTP / providers live in apps/api; this module stays provider-agnostic.
 */

export type DishVisionConfidence = 'low' | 'medium' | 'high';

export interface DishVisionResult {
  dishName: string;
  ingredients: string[];
  /** Model self-reported confidence for the dish ID / ingredient list. */
  confidence: DishVisionConfidence;
  /** Optional short caveat from the model (RU/EN). */
  notes?: string;
}

const DISH_VISION_SYSTEM = [
  'You identify a prepared dish or food from a photo for allergy screening.',
  'There may be no readable text on the image — rely on appearance only.',
  'Reply with a single JSON object only. No markdown fences, no commentary.',
].join(' ');

/**
 * User prompt paired with the image in the multimodal request.
 * Kept in @allerguide/ai so API and tests share one source of truth.
 */
export function buildDishVisionPrompt(localeHint = 'ru'): string {
  return [
    'Определи блюдо на фото и типичный состав (как в приложениях подсчёта калорий).',
    'Ответь ТОЛЬКО JSON без markdown:',
    '{"dishName":"…","ingredients":["…"],"confidence":"low|medium|high","notes":"…"}',
    'Правила:',
    '- dishName — короткое узнаваемое название (предпочтительно на русском, если блюдо типично для RU/EU).',
    '- ingredients — вероятные ингредиенты порции (8–20 пунктов), включая скрытые аллергены (молоко, яйцо, глютен, орехи, соя, рыба и т.п.), если они типичны для рецепта.',
    '- Если уверенность низкая — confidence:"low" и честный notes; не выдумывай экзотику.',
    '- Если на фото не еда — dishName:"", ingredients:[], confidence:"low", notes с пояснением.',
    `- Язык названий ингредиентов: ${localeHint}.`,
  ].join('\n');
}

export function dishVisionSystemInstruction(): string {
  return DISH_VISION_SYSTEM;
}

function asConfidence(value: unknown): DishVisionConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

/** Parse model JSON into a normalized dish vision result, or null if unusable. */
export function parseDishVisionResponse(raw: string): DishVisionResult | null {
  if (!raw?.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(raw));
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const dishName = typeof obj.dishName === 'string' ? obj.dishName.trim() : '';
  const ingredients = Array.isArray(obj.ingredients)
    ? obj.ingredients
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .slice(0, 30)
    : [];
  const notes = typeof obj.notes === 'string' ? obj.notes.trim() : undefined;
  const confidence = asConfidence(obj.confidence);

  if (!dishName && ingredients.length === 0) return null;

  return {
    dishName: dishName || 'Блюдо (по фото)',
    ingredients,
    confidence,
    ...(notes ? { notes } : {}),
  };
}

/** Flatten vision output into ingredient text for runSmartScan / keyword match. */
export function dishVisionToScanText(result: DishVisionResult): string {
  const parts = [result.dishName, ...result.ingredients].map((part) => part.trim()).filter(Boolean);
  return parts.join(', ');
}

/** True when OCR text is too sparse to identify a dish without looking at the image. */
export function shouldUseDishVisionForOcrText(ocrText: string, minChars = 2): boolean {
  return ocrText.trim().length < minChars;
}
