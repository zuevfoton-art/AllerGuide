import {
  buildCombinedScanText,
  buildOcrScanProductName,
  dishVisionToScanText,
  parseMedicineLabelText,
  prepareScanTextFromOcr,
  resolveScanEvidenceKind,
  simulateOcrFromCapture,
  asVisionOcrResult,
  classifyScanIntentHeuristic,
  shouldUseDishVisionForOcrText,
  type ScanEvidenceKind,
  type ScanMode,
  type OcrExtractionResult,
} from '@allerguide/ai';
import { toMedicineCard, type MedicineCard, type Profile } from '@allerguide/core';
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
  ScanCloudAuthError,
  type ScanResultExtended,
} from '@/src/services/scan-analysis';
import {
  analyzeDishVisionEstimate,
  DishVisionScanError,
  fetchDishVisionEstimate,
  trackDishVisionAnalytics,
  type DishVisionEstimate,
} from '@/src/services/scanner-dish-vision-service';

function isNoTextOcrFailure(status?: number, error?: string): boolean {
  if (status === 422) return true;
  return /no text/i.test(error ?? '') || error === 'No text recognized';
}

function extractionLooksLikeCloudOcrOutage(extraction: OcrExtractionResult): boolean {
  return extraction.warnings.some((warning) => /Облачный OCR недоступен/i.test(warning));
}

function dishVisionToHistoryInput(estimate: DishVisionEstimate): string {
  return dishVisionToScanText(estimate.result);
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
  return { ...result, ocr: extraction, evidence: 'ocr' };
}

/** Intent/mode must see the pack title (таблетки / МНН), not only the stripped composition. */
function extractionForScanIntent(
  extraction: OcrExtractionResult,
  originalLabelText?: string,
): OcrExtractionResult {
  const text = originalLabelText?.trim();
  if (!text) return extraction;
  return { ...extraction, text };
}

function medicineCardFromLabelText(text: string): MedicineCard | undefined {
  const parsed = parseMedicineLabelText(text);
  if (!parsed) return undefined;
  return toMedicineCard(parsed, 'ocr');
}

async function persistFinalScan(
  profile: Profile | null | undefined,
  inputText: string,
  result: ScanResultExtended,
  productName: string | undefined,
  visionEstimate: DishVisionEstimate | null,
): Promise<ScanResultExtended> {
  if (profile) {
    await saveScanHistory(profile.id, inputText, result, productName);
  }
  if (visionEstimate) {
    trackDishVisionAnalytics(visionEstimate);
  }
  return result;
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
  // Photo scans: VL first for any photo; OCR is merged when the label is readable.
  // Barcode path (`scanBarcode`) is separate and unchanged.
  const shouldTryVlFirst =
    AI_DISH_VISION_ENABLED &&
    Boolean(imageBase64?.trim()) &&
    !ocrText?.trim() &&
    !manualText?.trim();

  let visionEstimate: DishVisionEstimate | null = null;
  let dishVisionError: DishVisionScanError | undefined;
  if (shouldTryVlFirst) {
    const attempted = await fetchDishVisionEstimate({
      imageBase64: imageBase64!,
      mimeType,
    });
    visionEstimate = attempted.estimate;
    dishVisionError = attempted.error;
  }

  let extraction: OcrExtractionResult;
  try {
    extraction = ocrText?.trim()
      ? prepareScanTextFromOcr(ocrText, mode)
      : await extractOcrFromImage({ mode, imageBase64, mimeType, manualText });
  } catch (error) {
    // Label OCR needs auth, but a plate VL hit can still be shown.
    if (isScanCloudAuthError(error) && visionEstimate) {
      const vlOnly = await analyzeDishVisionEstimate({
        mode,
        estimate: visionEstimate,
        profile,
        extraction: emptyVisionOcrResult('Для чтения текста этикетки нужен вход в аккаунт.'),
      });
      return persistFinalScan(
        profile,
        dishVisionToHistoryInput(visionEstimate),
        vlOnly,
        visionEstimate.result.dishName,
        visionEstimate,
      );
    }
    throw error;
  }

  const readableOcrText = hasReadableOcrText(extraction.text);
  const hasLabelOcrSnippet = !shouldUseDishVisionForOcrText(extraction.text);

  // Plate-only (no label text): keep VL result or surface VL failure — never empty clear.
  // Short OCR from a label must continue to the OCR path: VL often says “not a dish”.
  if (shouldTryVlFirst && !readableOcrText && !hasLabelOcrSnippet) {
    if (visionEstimate) {
      const vlOnly = await analyzeDishVisionEstimate({
        mode,
        estimate: visionEstimate,
        profile,
        extraction,
      });
      return persistFinalScan(
        profile,
        dishVisionToHistoryInput(visionEstimate),
        vlOnly,
        visionEstimate.result.dishName,
        visionEstimate,
      );
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

  if (shouldTryVlFirst && !readableOcrText && hasLabelOcrSnippet && !visionEstimate) {
    extraction = {
      ...extraction,
      warnings: [
        ...extraction.warnings,
        'Текст этикетки распознан частично — сверьте упаковку или введите состав вручную.',
      ],
    };
  }

  // A: heuristic intent. B (flag): YandexGPT intent via /api/scan/intent.
  // Composition extraction drops «таблетки» / МНН headers — classify the original label.
  const originalLabelText = ocrText?.trim() || manualText?.trim();
  const intentExtraction = extractionForScanIntent(extraction, originalLabelText);
  const llmIntent = await classifyScanIntentViaApi({
    text: intentExtraction.text,
    fallbackMode: mode,
  });
  const classification =
    llmIntent ?? classifyScanIntentHeuristic(intentExtraction, mode);
  const intent = classification.intent;
  const analysisMode = classification.mode;

  if (intent === 'visual_product' && !visionEstimate) {
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

        return persistFinalScan(
          profile,
          dishLookup.ingredients,
          { ...result, ocr: extraction, evidence: 'ocr' },
          dishLookup.productName,
          null,
        );
      }
    } catch (error) {
      logCaughtError('scanner.lookupDishIngredients', error, { level: 'warn' });
    }
  }

  const ocrNote =
    extraction.source === 'demo'
      ? extraction.warnings.join(' ')
      : extraction.warnings.length
        ? extraction.warnings.join(' ')
        : undefined;

  // Menu: scan full normalized text so dish names/descriptions are checked.
  const ocrScanText =
    analysisMode === 'menu'
      ? extraction.ingredientsBlock
        ? `${extraction.text}\n${extraction.ingredientsBlock}`
        : extraction.text
      : extraction.text;

  const evidence: ScanEvidenceKind = resolveScanEvidenceKind({
    hasVision: Boolean(visionEstimate),
    hasReadableOcr: readableOcrText,
  });

  const scanText =
    visionEstimate && (readableOcrText || hasLabelOcrSnippet)
      ? buildCombinedScanText({
          ocrText: ocrScanText,
          visionIngredients: visionEstimate.result.ingredients,
          dishName: visionEstimate.result.dishName,
        })
      : ocrScanText;

  const productName =
    visionEstimate?.result.dishName?.trim() || buildOcrScanProductName(analysisMode);

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

  const medicineCard =
    analysisMode === 'medicine'
      ? medicineCardFromLabelText(intentExtraction.text)
      : undefined;

  return persistFinalScan(
    profile,
    extraction.text,
    {
      ...result,
      mode: analysisMode,
      ocr: extraction,
      menuScanStatus,
      evidence,
      productCategory:
        analysisMode === 'medicine'
          ? 'medicine'
          : analysisMode === 'cosmetics'
            ? 'beauty'
            : undefined,
      medicineCard,
      ...(visionEstimate ? { dishVision: visionEstimate.result } : {}),
    },
    medicineCard?.name || productName,
    visionEstimate,
  );
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
