import { runSmartScan, type ScanMode, type ScanResult } from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_SCAN_ENABLED, PRODUCT_DB_ENABLED } from '@/src/constants/features';
import { fetchProductByBarcode } from '@/src/services/open-food-facts-service';
import { fetchProductFromCatalog } from '@/src/services/catalog-api';
import { saveScanHistory } from '@/src/services/scan-history-service';
import { trackEvent } from '@/src/services/analytics-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const DEMO_MENU_TEXT =
  'Паста карбонара (сливки, сыр пармезан), салат с орехами и молочной заправкой, тирамisu (яйца, молоко).';

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
}): Promise<ScanResult> {
  const result = await runSmartScan({
    ...input,
    llmEndpoint: getLlmEndpoint(),
  });
  trackEvent('scan_completed', {
    mode: result.mode,
    level: result.level,
    source: result.source ?? input.source ?? 'manual',
    matches: result.matches.length,
  });
  return result;
}

export async function scanBarcode({
  barcode,
  profile,
}: {
  barcode: string;
  profile?: Profile | null;
}): Promise<ScanResult & { lookupFailed?: boolean }> {
  // Prefer the backend product catalog (indexed DB) when enabled.
  if (PRODUCT_DB_ENABLED) {
    const catalogProduct = await fetchProductFromCatalog(barcode);
    if (catalogProduct) {
      const text = [catalogProduct.ingredients, ...catalogProduct.allergenTags]
        .filter(Boolean)
        .join(', ');
      const result = await analyzeText({
        mode: 'product',
        text,
        profile,
        productName: catalogProduct.name,
        source: 'barcode',
      });
      if (profile) saveScanHistory(profile.id, text || barcode, result, catalogProduct.name);
      return result;
    }
  }

  const product = await fetchProductByBarcode(barcode);

  if (!product) {
    const fallback = await analyzeText({
      mode: 'product',
      text: barcode,
      profile,
      source: 'barcode',
    });
    const result = {
      ...fallback,
      reason: 'Продукт не найден в Open Food Facts. Проверка выполнена по штрихкоду как тексту.',
      lookupFailed: true,
    };
    if (profile) saveScanHistory(profile.id, barcode, result);
    return result;
  }

  const result = await analyzeText({
    mode: 'product',
    text: product.ingredients,
    profile,
    productName: product.name,
    source: 'openfoodfacts',
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

export async function scanMenuPhoto({ profile }: { profile?: Profile | null }): Promise<ScanResult> {
  const result = await analyzeText({
    mode: 'menu',
    text: DEMO_MENU_TEXT,
    profile,
    productName: 'Меню ресторана (демо)',
    source: 'ocr',
  });
  const demoResult: ScanResult = {
    ...result,
    reason: `${result.reason} Демо-режим: фото не распознаётся, использован пример меню.`,
  };
  if (profile) saveScanHistory(profile.id, DEMO_MENU_TEXT, demoResult, 'Меню ресторана (демо)');
  return demoResult;
}
