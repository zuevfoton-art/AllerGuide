import {
  extractGtinFromScan,
  extractNonBarcodeLabel,
  normalizeBarcode,
  resolveScanDiaryTarget,
  toMedicineCard,
  wasBarcodePreviouslyHighRisk,
  type MedicineCard,
  type Profile,
} from '@allerguide/core';
import { hasMedicinePackageLabelSignal, type ScanMode, type ScanResult } from '@allerguide/ai';
import { MEDICINE_DB_ENABLED } from '@/src/constants/features';
import {
  resolveProductByBarcode,
  type BarcodeScanStatus,
  type ResolvedBarcodeProduct,
} from '@/src/services/barcode-lookup-service';
import { fetchMedicineByBarcode, searchMedicinesFromCatalog } from '@/src/services/medicines-api';
import {
  findRememberedMedicineByBarcode,
  rememberMedicineCardLocally,
} from '@/src/services/medicine-memory';
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

async function resolveMedicineCardByBarcode(barcode: string): Promise<MedicineCard | null> {
  if (MEDICINE_DB_ENABLED) {
    const remote = await fetchMedicineByBarcode(barcode);
    if (remote) return remote;
  }
  return findRememberedMedicineByBarcode(barcode);
}

function cardWithLookupBarcode(card: MedicineCard, lookupCode: string): MedicineCard {
  if (card.barcode?.trim()) return card;
  const code = normalizeBarcode(lookupCode);
  return code ? { ...card, barcode: code } : card;
}

function cacheMedicineCard(card: MedicineCard): MedicineCard {
  return rememberMedicineCardLocally(card);
}

function barcodeScanStatusFor(
  result: Pick<ScanResultExtended, 'matches' | 'crossMatches' | 'traceMatches'>,
  composition: string,
): BarcodeScanStatus {
  const hasMatches =
    result.matches.length > 0 ||
    result.crossMatches.length > 0 ||
    (result.traceMatches?.length ?? 0) > 0;
  if (hasMatches) return 'found_match';
  if (composition.trim().length < INSUFFICIENT_INGREDIENTS_LENGTH) {
    return 'found_insufficient_composition';
  }
  return 'found_no_allergens';
}

async function analyzeMedicineCard(input: {
  card: MedicineCard;
  profile?: Profile | null;
  lookupCode: string;
  repeatUnsafe: boolean;
  source?: ScanResult['source'];
}): Promise<ScanResultExtended> {
  const composition = [input.card.ingredients, input.card.activeSubstance]
    .filter((part) => part.trim())
    .join(', ');
  const result = await analyzeText({
    mode: 'medicine',
    text: composition || input.card.name,
    profile: input.profile,
    productName: input.card.name,
    source: input.source ?? 'barcode',
    declaredAllergenIds: input.card.allergenTags,
  });
  const barcodeScanStatus = barcodeScanStatusFor(result, composition);
  if (input.profile) {
    await saveScanHistory(input.profile.id, input.lookupCode, result, input.card.name, {
      composition: composition || input.card.name,
    });
  }
  return {
    ...result,
    repeatUnsafe: input.repeatUnsafe,
    barcodeScanStatus,
    productCategory: 'medicine',
    productIngredients: composition || undefined,
    medicineCard: input.card,
  };
}

function medicineCardFromProduct(product: ResolvedBarcodeProduct): MedicineCard {
  return toMedicineCard(
    {
      name: product.name,
      manufacturer: product.brand ?? '',
      ingredients: product.ingredients,
      allergenTags: product.declaredAllergenIds,
      barcode: product.barcode,
      confidence: 'low',
    },
    'ocr',
  );
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

  const medicineCard = await resolveMedicineCardByBarcode(lookupCode);
  if (medicineCard) {
    const card = cacheMedicineCard(cardWithLookupBarcode(medicineCard, lookupCode));
    return analyzeMedicineCard({ card, profile, lookupCode, repeatUnsafe });
  }

  const product = await resolveProductByBarcode(lookupCode);

  if (!product) {
    const nameHint = extractNonBarcodeLabel(barcode);
    if (MEDICINE_DB_ENABLED && nameHint) {
      const cards = await searchMedicinesFromCatalog(nameHint);
      const card = cards[0];
      if (card) {
        return analyzeMedicineCard({
          card: cacheMedicineCard(card),
          profile,
          lookupCode,
          repeatUnsafe,
        });
      }
    }

    const result = barcodeNotFoundResult();
    if (profile) await saveScanHistory(profile.id, lookupCode, result);
    return { ...result, repeatUnsafe };
  }

  const labelText = [product.name, product.brand, product.ingredients]
    .filter((part) => part?.trim())
    .join('\n');
  const target = resolveScanDiaryTarget({
    productCategory: product.category,
    source: product.source,
    hasMedicineLabelSignal: hasMedicinePackageLabelSignal(labelText),
  });
  const scanSource: ScanResult['source'] =
    product.source === 'catalog_api' ? 'barcode' : product.source;
  const mode: ScanMode = target === 'medicine' ? 'medicine' : scanModeFromProductCategory(product.category);

  const result = await analyzeText({
    mode,
    text: product.ingredients,
    profile,
    productName: product.name,
    source: scanSource,
    declaredAllergenIds: product.declaredAllergenIds,
    traceAllergenIds: product.traceAllergenIds,
  });

  const barcodeScanStatus = barcodeScanStatusFor(result, product.ingredients);

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
    productCategory: target === 'medicine' ? 'medicine' : product.category,
    medicineCard:
      target === 'medicine'
        ? cacheMedicineCard(cardWithLookupBarcode(medicineCardFromProduct(product), lookupCode))
        : undefined,
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
