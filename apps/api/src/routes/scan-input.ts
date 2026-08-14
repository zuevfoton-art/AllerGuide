import type { ScanMode } from '@allerguide/ai';

const SCAN_MODES = new Set<ScanMode>(['product', 'menu', 'medicine', 'cosmetics']);

export const MAX_SCAN_TEXT_LENGTH = 8_000;
export const MAX_SCAN_INTENT_TEXT_LENGTH = 1_200;
export const MAX_SCAN_ALLERGENS = 64;
export const MAX_SCAN_PRODUCT_NAME_LENGTH = 200;

export type ParsedScanInput = {
  mode: ScanMode;
  text: string;
  allergens: string[];
  productName?: string;
};

export type ParsedScanIntentInput = {
  text: string;
  fallbackMode: ScanMode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMode(value: unknown, fallback: ScanMode): ScanMode | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !SCAN_MODES.has(value as ScanMode)) return null;
  return value as ScanMode;
}

function parseAllergens(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_SCAN_ALLERGENS) return null;

  const allergens: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    allergens.push(trimmed);
  }
  return allergens;
}

export function parseScanInput(body: unknown): ParsedScanInput | null {
  if (!isRecord(body)) return null;

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > MAX_SCAN_TEXT_LENGTH) return null;

  const mode = parseMode(body.mode, 'product');
  const allergens = parseAllergens(body.allergens);
  if (mode === null || allergens === null) return null;

  if (body.productName !== undefined && typeof body.productName !== 'string') {
    return null;
  }
  const productName = body.productName?.trim();
  if (productName && productName.length > MAX_SCAN_PRODUCT_NAME_LENGTH) return null;

  return {
    mode,
    text,
    allergens,
    productName: productName || undefined,
  };
}

export function parseScanIntentInput(body: unknown): ParsedScanIntentInput | null {
  if (!isRecord(body)) return null;

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > MAX_SCAN_INTENT_TEXT_LENGTH) return null;

  const fallbackMode = parseMode(body.fallbackMode, 'product');
  if (fallbackMode === null) return null;

  return { text, fallbackMode };
}
