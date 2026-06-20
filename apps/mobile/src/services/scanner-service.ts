import { runSmartScan, type ScanMode, type ScanResult } from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { AI_SCAN_ENABLED } from '@/src/constants/features';
import { fetchProductByBarcode } from '@/src/services/open-food-facts-service';
import { saveScanHistory } from '@/src/services/scan-history-service';

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
  return runSmartScan({
    ...input,
    llmEndpoint: getLlmEndpoint(),
  });
}

export async function scanBarcode({
  barcode,
  profile,
}: {
  barcode: string;
  profile?: Profile | null;
}): Promise<ScanResult & { lookupFailed?: boolean }> {
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
