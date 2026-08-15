import {
  runSmartScan,
  buildOcrScanProductName,
  prepareScanTextFromOcr,
  simulateOcrFromCapture,
  asVisionOcrResult,
  classifyScanIntentHeuristic,
  dishVisionToScanText,
  shouldUseDishVisionForOcrText,
  type DishVisionResult,
  type ScanMode,
  type ScanResult,
  type OcrExtractionResult,
} from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_DISH_VISION_ENABLED, AI_SCAN_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import {
  resolveProductByBarcode,
  type BarcodeScanStatus,
  type MenuScanStatus,
} from '@/src/services/barcode-lookup-service';
import { recognizeDishViaApi } from '@/src/services/dish-vision-api-service';
import { recognizeImageViaApi } from '@/src/services/ocr-api-service';
import { classifyScanIntentViaApi } from '@/src/services/scan-intent-api-service';
import { lookupDishIngredientsForScan } from '@/src/services/scanner-dish-lookup-service';
import { saveScanHistory, listScanHistory } from '@/src/services/scan-history-service';
import { wasBarcodePreviouslyHighRisk } from '@allerguide/core';
import { trackEvent } from '@/src/services/analytics-service';
import { logCaughtError } from '@/src/services/error-reporting';

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

const INSUFFICIENT_INGREDIENTS_LENGTH = 15;
/** OCR text at/above this length means “label/menu text present” → prefer OCR over VL. */
const READABLE_OCR_TEXT_MIN_CHARS = 40;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

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

/**
 * Staging/prod scan OCR + dish-vision require JWT when SCAN_REQUIRE_AUTH=true.
 * Surface a login hint instead of a generic “scanner failed” banner.
 */
export class ScanCloudAuthError extends Error {
  readonly status = 401;

  constructor(message = 'SCAN_CLOUD_AUTH_REQUIRED') {
    super(message);
    this.name = 'ScanCloudAuthError';
  }
}

export function isDishVisionScanError(error: unknown): error is DishVisionScanError {
  return error instanceof DishVisionScanError || (error as { name?: string })?.name === 'DishVisionScanError';
}

export function isScanCloudAuthError(error: unknown): error is ScanCloudAuthError {
  return (
    error instanceof ScanCloudAuthError || (error as { name?: string })?.name === 'ScanCloudAuthError'
  );
}

function isUnauthorizedCloudStatus(status?: number, error?: string): boolean {
  if (status === 401) return true;
  return /unauthorized|auth required|login required/i.test(error ?? '');
}

function isNoTextOcrFailure(status?: number, error?: string): boolean {
  if (status === 422) return true;
  return /no text/i.test(error ?? '') || error === 'No text recognized';
}

function extractionLooksLikeCloudOcrOutage(extraction: OcrExtractionResult): boolean {
  return extraction.warnings.some((warning) => /Облачный OCR недоступен/i.test(warning));
}

function getLlmEndpoint(): string | undefined {
  if (!AI_SCAN_ENABLED) return undefined;
  return `${API_BASE}/api/scan`;
}

async function analyzeText(input: {
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

export async function scanBarcode({
  barcode,
  profile,
}: {
  barcode: string;
  profile?: Profile | null;
}): Promise<ScanResultExtended> {
  trackEvent('scan_barcode', { lookup: 'pending' });
  const history = profile ? listScanHistory(profile.id) : [];
  const repeatUnsafe = wasBarcodePreviouslyHighRisk(history, barcode);
  const product = await resolveProductByBarcode(barcode);

  if (!product) {
    const fallback = await analyzeText({
      mode: 'product',
      text: barcode,
      profile,
      source: 'barcode',
    });
    const result: ScanResultExtended = {
      ...fallback,
      reason:
        'Продукт не найден в локальном кэше, каталоге и Open Food Facts. Проверка выполнена по штрихкоду как тексту.',
      lookupFailed: true,
      barcodeScanStatus: 'not_found',
    };
    if (profile) await saveScanHistory(profile.id, barcode, result);
    return { ...result, repeatUnsafe };
  }

  const scanSource: ScanResult['source'] =
    product.source === 'catalog_api' ? 'barcode' : product.source;

  const result = await analyzeText({
    mode: 'product',
    text: product.ingredients,
    profile,
    productName: product.name,
    source: scanSource,
    declaredAllergenIds: product.declaredAllergenIds,
    traceAllergenIds: product.traceAllergenIds,
  });

  const hasMatches =
    result.matches.length > 0 ||
    result.crossMatches.length > 0 ||
    (result.traceMatches?.length ?? 0) > 0;
  const isShortIngredients = product.ingredients.trim().length < INSUFFICIENT_INGREDIENTS_LENGTH;

  const barcodeScanStatus: BarcodeScanStatus = hasMatches
    ? 'found_match'
    : isShortIngredients
      ? 'found_insufficient_composition'
      : 'found_no_allergens';

  if (profile) {
    await saveScanHistory(profile.id, barcode, result, product.name, {
      composition: product.ingredients,
    });
  }

  return {
    ...result,
    repeatUnsafe,
    barcodeScanStatus,
    productBrand: product.brand,
    productImageUrl: product.imageUrl,
    productIngredients: product.ingredients,
  };
}

export async function scanText({
  mode,
  text,
  profile,
}: {
  mode: ScanMode;
  text: string;
  profile?: Profile | null;
}): Promise<ScanResultExtended> {
  const result = await analyzeText({ mode, text, profile, source: 'manual' });
  if (profile) await saveScanHistory(profile.id, text, result);
  return result;
}

export function extractOcrText(mode: ScanMode, manualText?: string): OcrExtractionResult {
  return simulateOcrFromCapture(mode, manualText);
}

function emptyVisionOcrResult(warning?: string): OcrExtractionResult {
  return {
    text: '',
    ingredientsBlock: '',
    source: 'vision',
    warnings: warning ? [warning] : [],
  };
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

function hasReadableOcrText(text: string): boolean {
  return text.trim().length >= READABLE_OCR_TEXT_MIN_CHARS;
}

/** Soft VL attempt so OCR can still run when the photo has readable text. */
async function tryDishVisionFirst(input: {
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

async function scanFromDishVision(input: {
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
      if (isUnauthorizedCloudStatus(vision.status, vision.error)) {
        throw new ScanCloudAuthError();
      }
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
    if (isScanCloudAuthError(error) || isDishVisionScanError(error)) throw error;
    throw new DishVisionScanError('DISH_VISION_FAILED');
  }
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

  // Plate-only (no label text): keep VL result or surface VL failure — never empty clear.
  if (shouldTryVlFirst && !readableOcrText) {
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
    if (shouldUseDishVisionForOcrText(extraction.text)) {
      if (extractionLooksLikeCloudOcrOutage(extraction)) {
        return analyzeWithDemoOcrFallback({ mode, profile, extraction });
      }
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
