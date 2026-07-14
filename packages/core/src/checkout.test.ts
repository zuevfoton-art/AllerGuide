import { describe, expect, it } from 'vitest';
import {
  CATALOG_PRODUCT_PRICES_MINOR,
  buildCheckoutSummary,
  calculateSubtotalMinor,
  formatMoneyMinor,
  getCatalogProductPriceMinor,
} from './checkout';
import { CATALOG_PRODUCTS } from './catalog';
import { validateDiscountCode } from './discount';

describe('checkout', () => {
  it('sums line items in minor units', () => {
    const subtotal = calculateSubtotalMinor([
      { productId: 'hypo-cream', quantity: 2, unitPriceMinor: 890_00 },
      { productId: 'oat-milk', quantity: 1, unitPriceMinor: 189_00 },
    ]);
    expect(subtotal).toBe(1_969_00);
  });

  it('builds summary with applied discount', () => {
    const items = [{ productId: 'air-purifier', quantity: 1, unitPriceMinor: 12_999_00 }];
    const discount = validateDiscountCode({ code: 'WELCOME10', subtotalMinor: 12_999_00 });
    expect(discount.ok).toBe(true);
    if (!discount.ok) return;

    const summary = buildCheckoutSummary(items, discount);
    expect(summary.subtotalMinor).toBe(12_999_00);
    expect(summary.discountMinor).toBe(1_299_90);
    expect(summary.totalMinor).toBe(11_699_10);
    expect(summary.discountCode).toBe('WELCOME10');
  });

  it('formats RUB amounts', () => {
    expect(formatMoneyMinor(1_299_00)).toMatch(/1\s?299/);
  });

  it('defines a price for every bundled catalog product and rejects unknown SKUs', () => {
    expect(Object.keys(CATALOG_PRODUCT_PRICES_MINOR).sort()).toEqual(
      CATALOG_PRODUCTS.map((product) => product.id).sort(),
    );
    expect(getCatalogProductPriceMinor('sunflower-spread')).toBe(650_00);
    expect(getCatalogProductPriceMinor('epipen-case')).toBe(1_290_00);
    expect(getCatalogProductPriceMinor('unknown-product')).toBeNull();
  });
});
