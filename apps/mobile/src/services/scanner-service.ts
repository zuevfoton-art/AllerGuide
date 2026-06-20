import { runMockScan, type ScanResult } from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { fetchProductByBarcode } from '@/src/services/open-food-facts-service';
import { saveScanHistory } from '@/src/services/scan-history-service';

const DEMO_MENU_TEXT =
  'Паста карбонара (сливки, сыр пармезан), салат с орехами и молочной заправкой, тирамisu (яйца, молоко).';

export async function scanBarcode({
  barcode,
  profile,
}: {
  barcode: string;
  profile?: Profile | null;
}): Promise<ScanResult & { lookupFailed?: boolean }> {
  const product = await fetchProductByBarcode(barcode);

  if (!product) {
    const fallback = runMockScan({
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

  const result = runMockScan({
    mode: 'product',
    text: product.ingredients,
    profile,
    productName: product.name,
    source: 'openfoodfacts',
  });
  if (profile) saveScanHistory(profile.id, product.ingredients, result, product.name);
  return result;
}

export function scanText({
  mode,
  text,
  profile,
}: {
  mode: 'product' | 'menu' | 'medicine';
  text: string;
  profile?: Profile | null;
}): ScanResult {
  const result = runMockScan({ mode, text, profile, source: 'manual' });
  if (profile) saveScanHistory(profile.id, text, result);
  return result;
}

export function scanMenuPhoto({ profile }: { profile?: Profile | null }): ScanResult {
  const result = runMockScan({
    mode: 'menu',
    text: DEMO_MENU_TEXT,
    profile,
    productName: 'Меню ресторана (демо)',
    source: 'ocr',
  });
  const demoResult: ScanResult = {
    ...result,
    reason: 'Демо-режим: фото не распознаётся. Показан пример типичного меню для проверки аллергенов.',
  };
  if (profile) saveScanHistory(profile.id, DEMO_MENU_TEXT, demoResult, 'Меню ресторана (демо)');
  return demoResult;
}
