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
    'Состав: вода, сахар, молоко сухое обезжиренное, какао, арахис, глютен пшеницы, соевый лецитин.',
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
