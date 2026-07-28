import {
  runSmartScan,
  buildOcrScanProductName,
  prepareScanTextFromOcr,
  simulateOcrFromCapture,
  asVisionOcrResult,
  type ScanMode,
  type ScanResult,
  type OcrExtractionResult,
} from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_SCAN_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { resolveProductByBarcode } from '@/src/services/barcode-lookup-service';
import { recognizeImageViaApi } from '@/src/services/ocr-api-service';
import { lookupDishIngredientsForScan } from '@/src/services/scanner-dish-lookup-service';
import { saveScanHistory, listScanHistory } from '@/src/services/scan-history-service';
import { wasBarcodePreviouslyHighRisk } from '@allerguide/core';
import { trackEvent } from '@/src/services/analytics-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

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
}): Promise<ScanResult & { lookupFailed?: boolean; repeatUnsafe?: boolean }> {
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
    const result = {
      ...fallback,
      reason:
        'Продукт не найден в локальном кэше, каталоге и Open Food Facts. Проверка выполнена по штрихкоду как тексту.',
      lookupFailed: true,
    };
    if (profile) saveScanHistory(profile.id, barcode, result);
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
  if (profile) saveScanHistory(profile.id, product.ingredients, result, product.name);
  return { ...result, repeatUnsafe };
}

export async function scanText({
  mode,
  text,
  profile,
}: {
  mode: ScanMode;
  text: string;
  profile?: Profile | null;
}): Promise<ScanResult> {
  const result = await analyzeText({ mode, text, profile, source: 'manual' });
  if (profile) saveScanHistory(profile.id, text, result);
  return result;
}

export function extractOcrText(mode: ScanMode, manualText?: string): OcrExtractionResult {
  return simulateOcrFromCapture(mode, manualText);
}

/**
 * Prefer cloud Vision when flagged; fall back to demo/manual so offline still works.
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
        const demo = simulateOcrFromCapture(input.mode);
        return {
          ...demo,
          warnings: [
            ...demo.warnings,
            `Облачный OCR недоступен (${cloud.error}). Показан демо-текст — лучше ввести состав вручную.`,
          ],
        };
      }
    } catch {
      // Network errors → demo below
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
}): Promise<ScanResult & { ocr?: OcrExtractionResult }> {
  const extraction = ocrText?.trim()
    ? prepareScanTextFromOcr(ocrText, mode)
    : await extractOcrFromImage({ mode, imageBase64, mimeType, manualText });

  // Product photos: OCR dish/product name → Open Food Facts / local dish catalog.
  if (mode === 'product') {
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
            ? `Состав найден в Open Food Facts / каталоге по запросу «${dishLookup.query}».`
            : `Состав блюда «${dishLookup.productName}» из локального справочника.`;

        const result = await analyzeText({
          mode,
          text: dishLookup.ingredients,
          profile,
          productName: dishLookup.productName,
          source: dishLookup.source,
          ocrNote: [ocrNote, offNote].filter(Boolean).join(' '),
          declaredAllergenIds: dishLookup.declaredAllergenIds,
          traceAllergenIds: dishLookup.traceAllergenIds,
        });

        if (profile) {
          saveScanHistory(profile.id, dishLookup.ingredients, result, dishLookup.productName);
        }
        return { ...result, ocr: extraction };
      }
    } catch {
      // Fall through to plain OCR text analysis.
    }
  }

  const productName = buildOcrScanProductName(mode);
  const ocrNote =
    extraction.source === 'demo'
      ? extraction.warnings.join(' ')
      : extraction.warnings.length
        ? extraction.warnings.join(' ')
        : undefined;

  const result = await analyzeText({
    mode,
    text: extraction.text,
    profile,
    productName,
    source: 'ocr',
    ocrNote,
  });

  if (profile) saveScanHistory(profile.id, extraction.text, result, productName);
  return { ...result, ocr: extraction };
}

export async function scanMenuPhoto({
  profile,
  ocrText,
}: {
  profile?: Profile | null;
  ocrText?: string;
}): Promise<ScanResult> {
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
}): Promise<ScanResult> {
  return scanFromOcr({ mode, ocrText, profile });
}
