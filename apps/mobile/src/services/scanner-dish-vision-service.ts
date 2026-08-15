import { dishVisionToScanText, type ScanMode, type OcrExtractionResult } from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_DISH_VISION_ENABLED } from '@/src/constants/features';
import { recognizeDishViaApi } from '@/src/services/dish-vision-api-service';
import { saveScanHistory } from '@/src/services/scan-history-service';
import { trackEvent } from '@/src/services/analytics-service';
import {
  analyzeText,
  emptyVisionOcrResult,
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

/** Soft VL attempt so OCR can still run when the photo has readable text. */
export async function tryDishVisionFirst(input: {
  mode: ScanMode;
  imageBase64: string;
  mimeType?: string;
  profile?: Profile | null;
}): Promise<{ result: ScanResultExtended | null; error?: DishVisionScanError }> {
  try {
    const result = await scanFromDishVision({
      mode: input.mode,
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
      profile: input.profile,
      extraction: emptyVisionOcrResult(),
    });
    return { result };
  } catch (error) {
    if (isDishVisionScanError(error)) return { result: null, error };
    throw error;
  }
}

export async function scanFromDishVision(input: {
  mode: ScanMode;
  imageBase64: string;
  mimeType?: string;
  profile?: Profile | null;
  extraction: OcrExtractionResult;
}): Promise<ScanResultExtended | null> {
  if (!AI_DISH_VISION_ENABLED) return null;

  try {
    const vision = await recognizeDishViaApi({
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
    });
    if (vision === null) return null;
    if (!vision.ok) {
      throw new DishVisionScanError(vision.error || 'DISH_VISION_FAILED', {
        status: vision.status,
        providerStatus: vision.providerStatus,
      });
    }

    const scanText = dishVisionToScanText(vision.result);
    if (!scanText.trim()) {
      throw new DishVisionScanError('DISH_VISION_EMPTY_RESULT');
    }

    const confidenceNote =
      vision.result.confidence === 'low'
        ? 'Уверенность модели низкая.'
        : vision.result.confidence === 'medium'
          ? 'Уверенность модели средняя.'
          : 'Уверенность модели высокая.';
    const modelNotes = vision.result.notes?.trim();
    const ocrNote = [
      'Оценка по фото блюда (без этикетки): название и вероятный состав определены моделью — это не лабораторный анализ и не замена состава на упаковке.',
      confidenceNote,
      modelNotes,
      ...input.extraction.warnings,
    ]
      .filter(Boolean)
      .join(' ');

    const result = await analyzeText({
      mode: input.mode === 'menu' ? 'product' : input.mode,
      text: scanText,
      profile: input.profile,
      productName: vision.result.dishName,
      source: 'dish_vision',
      ocrNote,
    });

    if (input.profile) {
      await saveScanHistory(input.profile.id, scanText, result, vision.result.dishName);
    }

    trackEvent('scan_dish_vision', {
      confidence: vision.result.confidence,
      ingredients: vision.result.ingredients.length,
      cached: Boolean(vision.cached),
    });

    return { ...result, ocr: input.extraction, dishVision: vision.result };
  } catch (error) {
    if (isDishVisionScanError(error)) throw error;
    throw new DishVisionScanError('DISH_VISION_FAILED');
  }
}
