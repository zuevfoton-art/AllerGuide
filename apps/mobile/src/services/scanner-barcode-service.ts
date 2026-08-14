import type { Profile } from '@allerguide/core';
import { wasBarcodePreviouslyHighRisk } from '@allerguide/core';
import type { ScanMode, ScanResult } from '@allerguide/ai';
import {
  resolveProductByBarcode,
  type BarcodeScanStatus,
} from '@/src/services/barcode-lookup-service';
import { saveScanHistory, listScanHistory } from '@/src/services/scan-history-service';
import { trackEvent } from '@/src/services/analytics-service';
import {
  analyzeText,
  INSUFFICIENT_INGREDIENTS_LENGTH,
  type ScanResultExtended,
} from '@/src/services/scan-analysis';

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
