import {
  extractGtinFromScan,
  extractNonBarcodeLabel,
  wasBarcodePreviouslyHighRisk,
  type Profile,
} from '@allerguide/core';
import type { ScanMode, ScanResult } from '@allerguide/ai';
import { MEDICINE_DB_ENABLED } from '@/src/constants/features';
import {
  resolveProductByBarcode,
  type BarcodeScanStatus,
} from '@/src/services/barcode-lookup-service';
import { searchMedicinesFromCatalog } from '@/src/services/medicines-api';
import { saveScanHistory, listScanHistory } from '@/src/services/scan-history-service';
import { trackEvent } from '@/src/services/analytics-service';
import {
  analyzeText,
  INSUFFICIENT_INGREDIENTS_LENGTH,
  type ScanResultExtended,
} from '@/src/services/scan-analysis';
import { scanModeFromProductCategory } from '@/src/services/scan-product-category';

function barcodeNotFoundResult(source: ScanResult['source'] = 'barcode'): ScanResultExtended {
  return {
    verdict: 'Нет данных',
    reason: '',
    matches: [],
    crossMatches: [],
    mode: 'product',
    level: 'low',
    source,
    lookupFailed: true,
    barcodeScanStatus: 'not_found',
  };
}

export async function scanBarcode({
  barcode,
  profile,
}: {
  barcode: string;
  profile?: Profile | null;
}): Promise<ScanResultExtended> {
  trackEvent('scan_barcode', { lookup: 'pending' });
  const lookupCode = extractGtinFromScan(barcode) || barcode.trim();
  const history = profile ? listScanHistory(profile.id) : [];
  const repeatUnsafe = wasBarcodePreviouslyHighRisk(history, lookupCode);
  const product = await resolveProductByBarcode(lookupCode);

  if (!product) {
    const nameHint = extractNonBarcodeLabel(barcode);
    if (MEDICINE_DB_ENABLED && nameHint) {
      const cards = await searchMedicinesFromCatalog(nameHint);
      const card = cards[0];
      if (card) {
        const composition = [card.ingredients, card.activeSubstance].filter((part) => part.trim()).join(', ');
        const result = await analyzeText({
          mode: 'medicine',
          text: composition || card.name,
          profile,
          productName: card.name,
          source: 'barcode',
          declaredAllergenIds: card.allergenTags,
        });
        const hasMatches =
          result.matches.length > 0 ||
          result.crossMatches.length > 0 ||
          (result.traceMatches?.length ?? 0) > 0;
        const barcodeScanStatus: BarcodeScanStatus = hasMatches
          ? 'found_match'
          : composition.trim().length < INSUFFICIENT_INGREDIENTS_LENGTH
            ? 'found_insufficient_composition'
            : 'found_no_allergens';
        if (profile) {
          await saveScanHistory(profile.id, lookupCode, result, card.name, {
            composition: composition || card.name,
          });
        }
        return {
          ...result,
          repeatUnsafe,
          barcodeScanStatus,
          productCategory: 'medicine',
          productIngredients: composition || undefined,
        };
      }
    }

    const result = barcodeNotFoundResult();
    if (profile) await saveScanHistory(profile.id, lookupCode, result);
    return { ...result, repeatUnsafe };
  }

  const scanSource: ScanResult['source'] =
    product.source === 'catalog_api' ? 'barcode' : product.source;
  const mode: ScanMode = scanModeFromProductCategory(product.category);

  const result = await analyzeText({
    mode,
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
    await saveScanHistory(profile.id, lookupCode, result, product.name, {
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
    productCategory: product.category,
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
