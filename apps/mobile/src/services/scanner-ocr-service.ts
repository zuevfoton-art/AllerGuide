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
  isScanCloudAuthError,
  isUnauthorizedCloudStatus,
  READABLE_OCR_TEXT_MIN_CHARS,
  ScanCloudAuthError,
  type ScanResultExtended,
} from '@/src/services/scan-analysis';
import {
  DishVisionScanError,
  tryDishVisionFirst,
} from '@/src/services/scanner-dish-vision-service';

function isNoTextOcrFailure(status?: number, error?: string): boolean {
  if (status === 422) return true;
  return /no text/i.test(error ?? '') || error === 'No text recognized';
}

function extractionLooksLikeCloudOcrOutage(extraction: OcrExtractionResult): boolean {
  return extraction.warnings.some((warning) => /Облачный OCR недоступен/i.test(warning));
}

export function extractOcrText(mode: ScanMode, manualText?: string): OcrExtractionResult {
  return simulateOcrFromCapture(mode, manualText);
}

/**
 * Cloud Vision OCR when flagged; demo/manual offline fallback.
 * Empty / no-text (422) stays empty so the VL-first photo path can keep a plate estimate.
 * Auth failures throw ScanCloudAuthError — do not pretend the photo had no text.
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
        if (isUnauthorizedCloudStatus(cloud.status, cloud.error)) {
          throw new ScanCloudAuthError();
        }
        const noText = isNoTextOcrFailure(cloud.status, cloud.error);
        if (noText) {
          return emptyVisionOcrResult(
            'На фото нет читаемого текста — используем распознавание блюда по виду.',
          );
        }
        // Soft outage while VL is on: empty text lets plate VL try; scanFromOcr
        // falls back to demo OCR if VL also fails (label photos stay usable offline).
        if (AI_DISH_VISION_ENABLED) {
          return emptyVisionOcrResult(`Облачный OCR недоступен (${cloud.error}).`);
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
      if (isScanCloudAuthError(error)) throw error;
      logCaughtError('scanner.extractOcrFromImage', error, { level: 'warn' });
      if (AI_DISH_VISION_ENABLED) {
        return emptyVisionOcrResult('Облачный OCR недоступен.');
      }
    }
  }

  return simulateOcrFromCapture(input.mode, input.manualText);
}

async function analyzeWithDemoOcrFallback(input: {
  mode: ScanMode;
  profile?: Profile | null;
  extraction: OcrExtractionResult;
}): Promise<ScanResultExtended> {
  const demo = simulateOcrFromCapture(input.mode);
  const extraction: OcrExtractionResult = {
    ...demo,
    warnings: [
      ...input.extraction.warnings,
      ...demo.warnings,
      'Показан демо-текст — лучше ввести состав вручную или войти для облачного OCR.',
    ],
  };
  const productName = buildOcrScanProductName(input.mode);
  const result = await analyzeText({
    mode: input.mode,
    text: extraction.text,
    profile: input.profile,
    productName,
    source: 'ocr',
    ocrNote: extraction.warnings.join(' '),
  });
  if (input.profile) {
    await saveScanHistory(input.profile.id, extraction.text, result, productName);
  }
  return { ...result, ocr: extraction };
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

  let extraction: OcrExtractionResult;
  try {
    extraction = ocrText?.trim()
      ? prepareScanTextFromOcr(ocrText, mode)
      : await extractOcrFromImage({ mode, imageBase64, mimeType, manualText });
  } catch (error) {
    // Label OCR needs auth, but a plate VL hit can still be shown.
    if (isScanCloudAuthError(error) && dishVisionResult) {
      return {
        ...dishVisionResult,
        ocr: emptyVisionOcrResult('Для чтения текста этикетки нужен вход в аккаунт.'),
      };
    }
    throw error;
  }

  const readableOcrText = hasReadableOcrText(extraction.text);
  const hasLabelOcrSnippet = !shouldUseDishVisionForOcrText(extraction.text);

  // Plate-only (no label text): keep VL result or surface VL failure — never empty clear.
  // Short OCR from a label must continue to the OCR path: VL often says “not a dish”.
  if (shouldTryVlFirst && !readableOcrText && !hasLabelOcrSnippet) {
    if (dishVisionResult) {
      return { ...dishVisionResult, ocr: extraction };
    }
    if (dishVisionError) {
      if (isUnauthorizedCloudStatus(dishVisionError.status, dishVisionError.message)) {
        throw new ScanCloudAuthError();
      }
      // OCR cloud outage (not “no text”) + VL failure → offline demo, not a hard stop.
      if (extractionLooksLikeCloudOcrOutage(extraction)) {
        return analyzeWithDemoOcrFallback({ mode, profile, extraction });
      }
      throw dishVisionError;
    }
    if (extractionLooksLikeCloudOcrOutage(extraction)) {
      return analyzeWithDemoOcrFallback({ mode, profile, extraction });
    }
    throw new DishVisionScanError('DISH_VISION_FAILED');
  }

  if (shouldTryVlFirst && !readableOcrText && hasLabelOcrSnippet && !dishVisionResult) {
    extraction = {
      ...extraction,
      warnings: [
        ...extraction.warnings,
        'Текст этикетки распознан частично — сверьте упаковку или введите состав вручную.',
      ],
    };
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
