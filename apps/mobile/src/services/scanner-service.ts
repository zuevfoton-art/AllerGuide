import { runSmartScan, type ScanMode, type ScanResult } from '@allerguide/ai';
import {
  buildOcrScanProductName,
  prepareScanTextFromOcr,
  simulateOcrFromCapture,
  type OcrExtractionResult,
} from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_SCAN_ENABLED } from '@/src/constants/features';
import { resolveProductByBarcode } from '@/src/services/barcode-lookup-service';
import { saveScanHistory } from '@/src/services/scan-history-service';
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
  const result = await runSmartScan({
    mode: input.mode,
    text: input.text,
    profile: input.profile,
    productName: input.productName,
    source: input.source,
    declaredAllergenIds: input.declaredAllergenIds,
    traceAllergenIds: input.traceAllergenIds,
    llmEndpoint: getLlmEndpoint(),
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
}): Promise<ScanResult & { lookupFailed?: boolean }> {
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
    return result;
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
  return result;
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

export async function scanFromOcr({
  mode,
  ocrText,
  profile,
  manualText,
}: {
  mode: ScanMode;
  ocrText?: string;
  manualText?: string;
  profile?: Profile | null;
}): Promise<ScanResult & { ocr?: OcrExtractionResult }> {
  const extraction = ocrText?.trim()
    ? prepareScanTextFromOcr(ocrText, mode)
    : simulateOcrFromCapture(mode, manualText);

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
