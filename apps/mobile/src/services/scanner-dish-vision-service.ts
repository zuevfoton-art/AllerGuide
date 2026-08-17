import { dishVisionToScanText, type DishVisionResult, type ScanMode, type OcrExtractionResult } from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_DISH_VISION_ENABLED } from '@/src/constants/features';
import { recognizeDishViaApi } from '@/src/services/dish-vision-api-service';
import { trackEvent } from '@/src/services/analytics-service';
import {
  analyzeText,
  emptyVisionOcrResult,
  isScanCloudAuthError,
  isUnauthorizedCloudStatus,
  ScanCloudAuthError,
  type ScanResultExtended,
} from '@/src/services/scan-analysis';

/** Thrown when plate-only dish vision was required but the API/provider failed. */
export class DishVisionScanError extends Error {
  readonly status?: number;
  readonly providerStatus?: number;

  constructor(message = 'DISH_VISION_FAILED', opts?: { status?: number; providerStatus?: number }) {
    super(message);
    this.name = 'DishVisionScanError';
    this.status = opts?.status;
    this.providerStatus = opts?.providerStatus;
  }
}

export function isDishVisionScanError(error: unknown): error is DishVisionScanError {
  return error instanceof DishVisionScanError || (error as { name?: string })?.name === 'DishVisionScanError';
}

export type DishVisionEstimate = {
  result: DishVisionResult;
  cached: boolean;
};

function confidenceNote(confidence: DishVisionResult['confidence']): string {
  if (confidence === 'low') return 'Уверенность модели низкая.';
  if (confidence === 'medium') return 'Уверенность модели средняя.';
  return 'Уверенность модели высокая.';
}

/** Network-only VL call. History and analytics stay on the final combined result. */
export async function fetchDishVisionEstimate(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<{ estimate: DishVisionEstimate | null; error?: DishVisionScanError }> {
  if (!AI_DISH_VISION_ENABLED) return { estimate: null };

  try {
    const vision = await recognizeDishViaApi({
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
    });
    if (vision === null) return { estimate: null };
    if (!vision.ok) {
      if (isUnauthorizedCloudStatus(vision.status, vision.error)) {
        throw new ScanCloudAuthError();
      }
      return {
        estimate: null,
        error: new DishVisionScanError(vision.error || 'DISH_VISION_FAILED', {
          status: vision.status,
          providerStatus: vision.providerStatus,
        }),
      };
    }

    const scanText = dishVisionToScanText(vision.result);
    if (!scanText.trim()) {
      return { estimate: null, error: new DishVisionScanError('DISH_VISION_EMPTY_RESULT') };
    }

    return { estimate: { result: vision.result, cached: Boolean(vision.cached) } };
  } catch (error) {
    if (isScanCloudAuthError(error)) throw error;
    if (error instanceof DishVisionScanError) return { estimate: null, error };
    return { estimate: null, error: new DishVisionScanError('DISH_VISION_FAILED') };
  }
}

export function trackDishVisionAnalytics(estimate: DishVisionEstimate): void {
  trackEvent('scan_dish_vision', {
    confidence: estimate.result.confidence,
    ingredients: estimate.result.ingredients.length,
    cached: estimate.cached,
  });
}

export async function analyzeDishVisionEstimate(input: {
  mode: ScanMode;
  estimate: DishVisionEstimate;
  profile?: Profile | null;
  extraction?: OcrExtractionResult;
}): Promise<ScanResultExtended> {
  const extraction = input.extraction ?? emptyVisionOcrResult();
  const scanText = dishVisionToScanText(input.estimate.result);
  const modelNotes = input.estimate.result.notes?.trim();
  const ocrNote = [
    'Оценка по фото блюда (без этикетки): название и вероятный состав определены моделью — это не лабораторный анализ и не замена состава на упаковке.',
    confidenceNote(input.estimate.result.confidence),
    modelNotes,
    ...extraction.warnings,
  ]
    .filter(Boolean)
    .join(' ');

  const result = await analyzeText({
    mode: input.mode === 'menu' ? 'product' : input.mode,
    text: scanText,
    profile: input.profile,
    productName: input.estimate.result.dishName,
    source: 'dish_vision',
    ocrNote,
  });

  return {
    ...result,
    ocr: extraction,
    dishVision: input.estimate.result,
    evidence: 'vl',
  };
}

/** Soft VL attempt so OCR can still run when the photo has readable text. */
export async function tryDishVisionFirst(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<{ estimate: DishVisionEstimate | null; error?: DishVisionScanError }> {
  return fetchDishVisionEstimate({
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
  });
}

export async function scanFromDishVision(input: {
  mode: ScanMode;
  imageBase64: string;
  mimeType?: string;
  profile?: Profile | null;
  extraction: OcrExtractionResult;
}): Promise<ScanResultExtended | null> {
  const attempted = await fetchDishVisionEstimate({
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
  });
  if (attempted.error) throw attempted.error;
  if (!attempted.estimate) return null;
  return analyzeDishVisionEstimate({
    mode: input.mode,
    estimate: attempted.estimate,
    profile: input.profile,
    extraction: input.extraction,
  });
}
