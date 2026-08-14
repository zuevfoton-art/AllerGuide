import {
  buildOcrScanProductName,
  prepareScanTextFromOcr,
  simulateOcrFromCapture,
  asVisionOcrResult,
  classifyScanIntentHeuristic,
  shouldUseDishVisionForOcrText,
  type ScanMode,
  type OcrExtractionResult,
} from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_DISH_VISION_ENABLED } from '@/src/constants/features';
import { recognizeImageViaApi } from '@/src/services/ocr-api-service';
import { classifyScanIntentViaApi } from '@/src/services/scan-intent-api-service';
import { lookupDishIngredientsForScan } from '@/src/services/scanner-dish-lookup-service';
import { saveScanHistory } from '@/src/services/scan-history-service';
import { logCaughtError } from '@/src/services/error-reporting';
import type { MenuScanStatus } from '@/src/services/barcode-lookup-service';
import {
  analyzeText,
  emptyVisionOcrResult,
  hasReadableOcrText,
  INSUFFICIENT_INGREDIENTS_LENGTH,
  READABLE_OCR_TEXT_MIN_CHARS,
  type ScanResultExtended,
} from '@/src/services/scan-analysis';
import {
  DishVisionScanError,
  tryDishVisionFirst,
} from '@/src/services/scanner-dish-vision-service';

export function extractOcrText(mode: ScanMode, manualText?: string): OcrExtractionResult {
  return simulateOcrFromCapture(mode, manualText);
}

/**
 * Cloud Vision OCR when flagged; demo/manual offline fallback.
 * Empty / no-text results stay empty so the VL-first photo path can keep a plate estimate.
 */
export async function extractOcrFromImage(input: {
  mode: ScanMode;
  imageBase64?: string;
  mimeType?: string;
  manualText?: string;
}): Promise<OcrExtractionResult> {
  if (input.manualText?.trim()) {
    return prepareScanTextFromOcr(input.manualText, input.mode);
  }

  if (input.imageBase64?.trim()) {
    try {
      const cloud = await recognizeImageViaApi({
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
      });
      if (cloud?.ok) {
        return asVisionOcrResult(prepareScanTextFromOcr(cloud.text, input.mode));
      }
      if (cloud && !cloud.ok) {
        const noText =
          cloud.status === 422 ||
          /no text/i.test(cloud.error) ||
          cloud.error === 'No text recognized';
        if (noText || AI_DISH_VISION_ENABLED) {
          return emptyVisionOcrResult(
            noText
              ? 'На фото нет читаемого текста — используем распознавание блюда по виду.'
              : `Облачный OCR недоступен (${cloud.error}).`,
          );
        }
        const demo = simulateOcrFromCapture(input.mode);
        return {
          ...demo,
          warnings: [
            ...demo.warnings,
            `Облачный OCR недоступен (${cloud.error}). Показан демо-текст — лучше ввести состав вручную.`,
          ],
        };
      }
    } catch (error) {
      logCaughtError('scanner.extractOcrFromImage', error, { level: 'warn' });
      if (AI_DISH_VISION_ENABLED) {
        return emptyVisionOcrResult('Облачный OCR недоступен.');
      }
    }
  }

  return simulateOcrFromCapture(input.mode, input.manualText);
}

export async function scanFromOcr({
  mode,
  ocrText,
  profile,
  manualText,
  imageBase64,
  mimeType,
}: {
  mode: ScanMode;
  ocrText?: string;
  manualText?: string;
  imageBase64?: string;
  mimeType?: string;
  profile?: Profile | null;
}): Promise<ScanResultExtended> {
  // Photo product scans: VL first; OCR only wins when readable text is on the photo.
  // Barcode path (`scanBarcode`) is separate and unchanged.
  const shouldTryVlFirst =
    AI_DISH_VISION_ENABLED &&
    mode === 'product' &&
    Boolean(imageBase64?.trim()) &&
    !ocrText?.trim() &&
    !manualText?.trim();

  let dishVisionResult: ScanResultExtended | null = null;
  let dishVisionError: DishVisionScanError | undefined;
  if (shouldTryVlFirst) {
    const attempted = await tryDishVisionFirst({
      mode,
      imageBase64: imageBase64!,
      mimeType,
      profile,
    });
    dishVisionResult = attempted.result;
    dishVisionError = attempted.error;
  }

  const extraction = ocrText?.trim()
    ? prepareScanTextFromOcr(ocrText, mode)
    : await extractOcrFromImage({ mode, imageBase64, mimeType, manualText });

  const readableOcrText = hasReadableOcrText(extraction.text);

  // Plate-only (no label text): keep VL result or surface VL failure — never empty clear.
  if (shouldTryVlFirst && !readableOcrText) {
    if (dishVisionResult) {
      return { ...dishVisionResult, ocr: extraction };
    }
    if (dishVisionError) throw dishVisionError;
    if (shouldUseDishVisionForOcrText(extraction.text)) {
      throw new DishVisionScanError('DISH_VISION_FAILED');
    }
  }

  // A: heuristic intent. B (flag): YandexGPT intent via /api/scan/intent.
  const llmIntent = await classifyScanIntentViaApi({
    text: extraction.text,
    fallbackMode: mode,
  });
  const classification =
    llmIntent ?? classifyScanIntentHeuristic(extraction, mode);
  const intent = classification.intent;
  const analysisMode = classification.mode;

  if (intent === 'visual_product') {
    try {
      const dishLookup = await lookupDishIngredientsForScan(extraction.text);
      if (dishLookup) {
        const ocrNote =
          extraction.source === 'demo'
            ? extraction.warnings.join(' ')
            : extraction.warnings.length
              ? extraction.warnings.join(' ')
              : undefined;
        const offNote =
          dishLookup.source === 'openfoodfacts' || dishLookup.source === 'catalog_api'
            ? `Умный поиск: состав найден в Open Food Facts / каталоге по запросу «${dishLookup.query}».`
            : `Умный поиск: состав блюда «${dishLookup.productName}» из локального справочника.`;

        const result = await analyzeText({
          mode: analysisMode === 'menu' ? 'product' : analysisMode,
          text: dishLookup.ingredients,
          profile,
          productName: dishLookup.productName,
          source: dishLookup.source,
          ocrNote: [ocrNote, offNote].filter(Boolean).join(' '),
          declaredAllergenIds: dishLookup.declaredAllergenIds,
          traceAllergenIds: dishLookup.traceAllergenIds,
        });

        if (profile) {
          await saveScanHistory(profile.id, dishLookup.ingredients, result, dishLookup.productName);
        }
        return { ...result, ocr: extraction };
      }
    } catch (error) {
      logCaughtError('scanner.lookupDishIngredients', error, { level: 'warn' });
    }

    // Short OCR name without catalog hit: reuse VL if we already ran it for this photo.
    if (
      dishVisionResult &&
      (shouldUseDishVisionForOcrText(extraction.text) ||
        extraction.text.trim().length < READABLE_OCR_TEXT_MIN_CHARS)
    ) {
      return { ...dishVisionResult, ocr: extraction };
    }
  }

  const productName = buildOcrScanProductName(analysisMode);
  const ocrNote =
    extraction.source === 'demo'
      ? extraction.warnings.join(' ')
      : extraction.warnings.length
        ? extraction.warnings.join(' ')
        : undefined;

  // Menu: scan full normalized text so dish names/descriptions are checked.
  const scanText =
    analysisMode === 'menu'
      ? extraction.ingredientsBlock
        ? `${extraction.text}\n${extraction.ingredientsBlock}`
        : extraction.text
      : extraction.text;

  const result = await analyzeText({
    mode: analysisMode,
    text: scanText,
    profile,
    productName,
    source: 'ocr',
    ocrNote,
  });

  const menuScanStatus: MenuScanStatus | undefined =
    analysisMode === 'menu'
      ? result.matches.length > 0 ||
        result.crossMatches.length > 0 ||
        (result.traceMatches?.length ?? 0) > 0
        ? 'text_match'
        : scanText.trim().length < INSUFFICIENT_INGREDIENTS_LENGTH
          ? 'incomplete_composition'
          : 'no_match'
      : undefined;

  if (profile) await saveScanHistory(profile.id, extraction.text, result, productName);
  return { ...result, ocr: extraction, menuScanStatus };
}

export async function scanMenuPhoto({
  profile,
  ocrText,
}: {
  profile?: Profile | null;
  ocrText?: string;
}): Promise<ScanResultExtended> {
  return scanFromOcr({ mode: 'menu', ocrText, profile });
}

export async function scanLabelPhoto({
  mode,
  profile,
  ocrText,
}: {
  mode: 'medicine' | 'cosmetics';
  profile?: Profile | null;
  ocrText?: string;
}): Promise<ScanResultExtended> {
  return scanFromOcr({ mode, ocrText, profile });
}
