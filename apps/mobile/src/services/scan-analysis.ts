import { runSmartScan, type DishVisionResult, type ScanMode, type ScanResult, type OcrExtractionResult } from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_SCAN_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import type { BarcodeScanStatus, MenuScanStatus } from '@/src/services/barcode-lookup-service';
import { trackEvent } from '@/src/services/analytics-service';

/** Extended fields attached to scan results in the mobile service layer. */
export type ScanResultExtended = ScanResult & {
  lookupFailed?: boolean;
  repeatUnsafe?: boolean;
  barcodeScanStatus?: BarcodeScanStatus;
  menuScanStatus?: MenuScanStatus;
  productBrand?: string;
  productImageUrl?: string;
  /** Full composition text when known (barcode / OFF). */
  productIngredients?: string;
  /** Product category when the lookup source provides it. */
  productCategory?: string;
  ocr?: OcrExtractionResult;
  /** Multimodal plate-only estimate (Option D). */
  dishVision?: DishVisionResult;
};

export const INSUFFICIENT_INGREDIENTS_LENGTH = 15;
/** OCR text at/above this length means “label/menu text present” → prefer OCR over VL. */
export const READABLE_OCR_TEXT_MIN_CHARS = 40;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

function getLlmEndpoint(): string | undefined {
  if (!AI_SCAN_ENABLED) return undefined;
  return `${API_BASE}/api/scan`;
}

export function emptyVisionOcrResult(warning?: string): OcrExtractionResult {
  return {
    text: '',
    ingredientsBlock: '',
    source: 'vision',
    warnings: warning ? [warning] : [],
  };
}

export function hasReadableOcrText(text: string): boolean {
  return text.trim().length >= READABLE_OCR_TEXT_MIN_CHARS;
}

export async function analyzeText(input: {
  mode: ScanMode;
  text: string;
  profile?: Profile | null;
  productName?: string;
  source?: ScanResult['source'];
  ocrNote?: string;
  declaredAllergenIds?: string[];
  traceAllergenIds?: string[];
}): Promise<ScanResult> {
  const llmApiKey = AI_SCAN_ENABLED ? ((await getBackendAuthToken()) ?? undefined) : undefined;
  const result = await runSmartScan({
    mode: input.mode,
    text: input.text,
    profile: input.profile,
    productName: input.productName,
    source: input.source,
    declaredAllergenIds: input.declaredAllergenIds,
    traceAllergenIds: input.traceAllergenIds,
    llmEndpoint: getLlmEndpoint(),
    llmApiKey,
  });
  trackEvent('scan_completed', {
    mode: result.mode,
    level: result.level,
    source: result.source ?? input.source ?? 'manual',
    matches: result.matches.length,
  });

  if (input.ocrNote) {
    return {
      ...result,
      reason: `${result.reason} ${input.ocrNote}`,
    };
  }

  return result;
}
