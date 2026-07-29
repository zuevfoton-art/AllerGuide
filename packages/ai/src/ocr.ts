import type { ScanMode } from './scan';

export interface OcrExtractionResult {
  text: string;
  source: 'manual' | 'demo' | 'normalized' | 'vision';
  ingredientsBlock?: string;
  warnings: string[];
}

const INGREDIENT_HEADERS = [
  /состав[:\s]/i,
  /ингредиенты[:\s]/i,
  /active\s+substance/i,
  /действующее\s+вещество/i,
  /composition[:\s]/i,
  /ingredients[:\s]/i,
];

const DEMO_OCR_SAMPLES: Record<ScanMode, string> = {
  menu:
    'Паста карбонара (сливки, сыр пармезан), салат с орехами и молочной заправкой, тирамису (яйца, молоко).',
  product:
    'Блюдо: оливье.\nСостав: картофель, морковь, яйца, зелёный горошек, майонез, курица.',
  medicine:
    'Действующее вещество: ибупрофен 200 мг. Вспомогательные вещества: лактоза, крахмал, магния стеарат.',
  cosmetics:
    'Состав: Aqua, Sodium Laureth Sulfate, Parfum, Limonene, Linalool, Methylisothiazolinone, Benzyl Alcohol, Lanolin.',
};

export function normalizeOcrText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractIngredientsBlock(text: string): string | undefined {
  const normalized = normalizeOcrText(text);
  if (!normalized) return undefined;

  for (const pattern of INGREDIENT_HEADERS) {
    const match = normalized.match(pattern);
    if (!match || match.index === undefined) continue;
    const tail = normalized.slice(match.index + match[0].length).trim();
    if (tail) return tail.split('\n')[0]?.trim() || tail;
  }

  return normalized.length > 20 ? normalized : undefined;
}

export function prepareScanTextFromOcr(text: string, mode: ScanMode): OcrExtractionResult {
  const normalized = normalizeOcrText(text);
  const warnings: string[] = [];

  if (!normalized) {
    return { text: '', source: 'manual', warnings: ['Пустой текст OCR'] };
  }

  const ingredientsBlock = extractIngredientsBlock(normalized);
  if (ingredientsBlock && (mode === 'medicine' || mode === 'cosmetics' || mode === 'product')) {
    return {
      text: ingredientsBlock,
      source: 'normalized',
      ingredientsBlock,
      warnings,
    };
  }

  if (mode === 'menu' && normalized.length < 12) {
    warnings.push('Короткий текст меню — проверьте распознавание');
  }

  return {
    text: normalized,
    source: 'manual',
    ingredientsBlock,
    warnings,
  };
}

export function getDemoOcrText(mode: ScanMode): string {
  return DEMO_OCR_SAMPLES[mode];
}

export function simulateOcrFromCapture(mode: ScanMode, manualText?: string): OcrExtractionResult {
  if (manualText?.trim()) {
    return prepareScanTextFromOcr(manualText, mode);
  }

  const demoText = getDemoOcrText(mode);
  const prepared = prepareScanTextFromOcr(demoText, mode);
  return {
    ...prepared,
    source: 'demo',
    warnings: [
      ...prepared.warnings,
      'Демо-режим OCR: для точного распознавания введите текст с упаковки вручную.',
    ],
  };
}

export function buildOcrScanProductName(mode: ScanMode): string {
  switch (mode) {
    case 'menu':
      return 'Меню (OCR)';
    case 'medicine':
      return 'Упаковка ЛС (OCR)';
    case 'cosmetics':
      return 'Косметика / бытовая химия (OCR)';
    default:
      return 'Продукт (OCR)';
  }
}

/**
 * Local fallback only. Cloud Vision OCR is `POST /api/ocr` (mobile `ocr-api-service`).
 * Screens must not call Yandex directly — keep offline demo when the API is off.
 */
export async function runOcrFromImageUri(
  _imageUri: string,
  mode: ScanMode,
): Promise<OcrExtractionResult> {
  return simulateOcrFromCapture(mode);
}

/** Mark prepared OCR text as coming from cloud Vision (after API success). */
export function asVisionOcrResult(
  prepared: OcrExtractionResult,
  extraWarnings: string[] = [],
): OcrExtractionResult {
  return {
    ...prepared,
    source: 'vision',
    warnings: [...prepared.warnings, ...extraWarnings],
  };
}

/** How to continue after Vision OCR / demo OCR on a captured photo. */
export type ScanImageIntent = 'label_or_menu' | 'visual_product';

const LABEL_HINT =
  /состав|ингредиент|ingredients|composition|действующ|вспомогательн|active\s+substance|aqua\s*,|sodium\s+/i;
const MENU_HINT = /меню|menu|порци|руб\.?|₽|grill|салат|паста|суп/i;
const MIN_LABEL_CHARS = 40;
const MIN_LABEL_WORDS = 6;

/**
 * Decide OCR-analysis vs smart product search from recognized text density.
 * Dense / composition-like text → label or menu (OCR + YandexGPT on text).
 * Sparse / name-only → visual product (dish/OFF smart search).
 */
export function classifyScanImageIntent(extraction: OcrExtractionResult): ScanImageIntent {
  const text = extraction.text.trim();
  if (!text) return 'visual_product';

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasIngredients = Boolean(extraction.ingredientsBlock?.trim());
  const looksLikeLabel = hasIngredients || LABEL_HINT.test(text);
  const looksLikeMenu = MENU_HINT.test(text) && wordCount >= MIN_LABEL_WORDS;
  const substantial = text.length >= MIN_LABEL_CHARS || wordCount >= MIN_LABEL_WORDS;

  if (looksLikeLabel || looksLikeMenu || (substantial && text.length >= 80)) {
    return 'label_or_menu';
  }
  return 'visual_product';
}

export function resolveScanModeForIntent(
  intent: ScanImageIntent,
  extraction: OcrExtractionResult,
  fallback: ScanMode,
): ScanMode {
  if (intent !== 'label_or_menu') return fallback === 'menu' ? 'product' : fallback;
  if (MENU_HINT.test(extraction.text)) return 'menu';
  if (/действующ|таблет|мг\b|лекарств/i.test(extraction.text)) return 'medicine';
  if (/aqua|parfum|sodium|косметик/i.test(extraction.text)) return 'cosmetics';
  return fallback === 'menu' ? 'product' : fallback;
}
