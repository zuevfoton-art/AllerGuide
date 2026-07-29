import type { ScanMode } from './scan';
import type { OcrExtractionResult, ScanImageIntent } from './ocr';
import { classifyScanImageIntent, resolveScanModeForIntent } from './ocr';

export type { ScanImageIntent };

export interface ScanIntentClassification {
  intent: ScanImageIntent;
  mode: ScanMode;
  source: 'heuristic' | 'llm';
}

const INTENT_VALUES = new Set<ScanImageIntent>(['label_or_menu', 'visual_product']);

/**
 * Prompt for YandexGPT / OpenAI: classify OCR snippet without looking at pixels.
 * Used when `YC_SCAN_INTENT_LLM` is on (option B).
 */
export function buildScanIntentPrompt(ocrText: string): string {
  const snippet = ocrText.trim().slice(0, 1200);
  return [
    'Ты классификатор кадров сканера аллергии.',
    'По тексту OCR определи тип содержимого.',
    'Ответь ТОЛЬКО JSON без markdown:',
    '{"intent":"label_or_menu|visual_product","mode":"product|menu|medicine|cosmetics"}',
    'Правила:',
    '- label_or_menu: этикетка, состав, меню, инструкция к ЛС, INCI — много текста про состав/блюда',
    '- visual_product: короткое название блюда/продукта/упаковки без развёрнутого состава',
    '- mode=menu для меню ресторана; medicine для лекарств; cosmetics для косметики/быта; иначе product',
    `OCR текст: ${snippet || '(пусто)'}`,
  ].join('\n');
}

export function parseScanIntentResponse(
  raw: string | null | undefined,
): { intent: ScanImageIntent; mode: ScanMode } | null {
  if (!raw?.trim()) return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { intent?: string; mode?: string };
    if (!parsed.intent || !INTENT_VALUES.has(parsed.intent as ScanImageIntent)) return null;
    const mode = normalizeMode(parsed.mode);
    return { intent: parsed.intent as ScanImageIntent, mode };
  } catch {
    const intentMatch = cleaned.match(/label_or_menu|visual_product/);
    if (!intentMatch) return null;
    return {
      intent: intentMatch[0] as ScanImageIntent,
      mode: normalizeMode(cleaned.match(/product|menu|medicine|cosmetics/)?.[0]),
    };
  }
}

function normalizeMode(raw: string | undefined): ScanMode {
  if (raw === 'menu' || raw === 'medicine' || raw === 'cosmetics' || raw === 'product') {
    return raw;
  }
  return 'product';
}

/** Option A — local heuristic (always available offline). */
export function classifyScanIntentHeuristic(
  extraction: OcrExtractionResult,
  fallbackMode: ScanMode = 'product',
): ScanIntentClassification {
  const intent = classifyScanImageIntent(extraction);
  return {
    intent,
    mode: resolveScanModeForIntent(intent, extraction, fallbackMode),
    source: 'heuristic',
  };
}

/**
 * Merge LLM classification with heuristic fallback (option B).
 * Invalid / missing LLM → heuristic.
 */
export function resolveScanIntentClassification(input: {
  extraction: OcrExtractionResult;
  fallbackMode?: ScanMode;
  llmRaw?: string | null;
}): ScanIntentClassification {
  const fallbackMode = input.fallbackMode ?? 'product';
  const llm = parseScanIntentResponse(input.llmRaw);
  if (llm) {
    return { intent: llm.intent, mode: llm.mode, source: 'llm' };
  }
  return classifyScanIntentHeuristic(input.extraction, fallbackMode);
}
