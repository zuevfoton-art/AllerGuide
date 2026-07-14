import { describe, expect, it } from 'vitest';
import { buildCheckoutSummary, calculateSubtotalMinor, formatMoneyMinor } from './checkout';
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
});
