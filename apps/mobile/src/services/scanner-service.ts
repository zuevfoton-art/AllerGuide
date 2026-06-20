import { runMockScan, type ScanResult } from '@allerguide/ai';
import type { Profile } from '@allerguide/core';
import { fetchProductByBarcode } from '@/src/services/open-food-facts-service';

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
    return {
      ...fallback,
      reason: 'Продукт не найден в Open Food Facts. Проверка выполнена по штрихкоду как тексту.',
      lookupFailed: true,
    };
  }

  return runMockScan({
    mode: 'product',
    text: product.ingredients,
    profile,
    productName: product.name,
    source: 'openfoodfacts',
  });
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
  return runMockScan({ mode, text, profile, source: 'manual' });
}

const DEMO_MENU_TEXT =
  'Паста карбонара (сливки, сыр пармезан), салат с орехами и молочной заправкой, тирамisu (яйца, молоко).';

export function scanMenuPhoto({ profile }: { profile?: Profile | null }): ScanResult {
  return runMockScan({
    mode: 'menu',
    text: DEMO_MENU_TEXT,
    profile,
    productName: 'Меню ресторана',
    source: 'manual',
  });
}
