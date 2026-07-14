import type { DiscountValidationResult } from './discount';

/** Reference prices for bundled marketplace SKUs (minor units / kopecks). */
export const CATALOG_PRODUCT_PRICES_MINOR: Record<string, number> = {
  'air-purifier': 12_999_00,
  'hypo-cream': 890_00,
  'bed-covers': 3_490_00,
  'oat-milk': 189_00,
  'sunflower-spread': 650_00,
  'epipen-case': 1_290_00,
};

export interface CheckoutLineItem {
  productId: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface CheckoutSummary {
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  discountCode?: string;
}

export function getCatalogProductPriceMinor(productId: string): number | null {
  return CATALOG_PRODUCT_PRICES_MINOR[productId] ?? null;
}

export function calculateSubtotalMinor(items: CheckoutLineItem[]): number {
  return items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(item.quantity));
    const price = Math.max(0, item.unitPriceMinor);
    return sum + qty * price;
  }, 0);
}

export function buildCheckoutSummary(
  items: CheckoutLineItem[],
  discount?: Extract<DiscountValidationResult, { ok: true }>,
): CheckoutSummary {
  const subtotalMinor = calculateSubtotalMinor(items);
  const discountMinor = discount?.discountMinor ?? 0;
  return {
    subtotalMinor,
    discountMinor,
    totalMinor: Math.max(0, subtotalMinor - discountMinor),
    discountCode: discount?.code,
  };
}

/** Format minor currency units for RU storefront display. */
export function formatMoneyMinor(amountMinor: number, currency = 'RUB'): string {
  const major = amountMinor / 100;
  if (currency === 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(major);
  }
  return `${major.toFixed(2)} ${currency}`;
}
