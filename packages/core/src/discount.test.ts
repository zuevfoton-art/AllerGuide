import { describe, expect, it } from 'vitest';
import {
  BUNDLED_DISCOUNT_CODES,
  calculateDiscountMinor,
  normalizeDiscountCode,
  validateDiscountCode,
} from './discount';

describe('discount', () => {
  it('normalizes codes case-insensitively', () => {
    expect(normalizeDiscountCode(' welcome10 ')).toBe('WELCOME10');
  });

  it('applies percent discount WELCOME10', () => {
    const result = validateDiscountCode({ code: 'welcome10', subtotalMinor: 150_000 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discountMinor).toBe(15_000);
    expect(result.totalMinor).toBe(135_000);
  });

  it('rejects WELCOME10 below minimum subtotal', () => {
    const result = validateDiscountCode({ code: 'WELCOME10', subtotalMinor: 50_000 });
    expect(result).toEqual({ ok: false, error: 'below_minimum' });
  });

  it('applies fixed discount SAVE500', () => {
    const result = validateDiscountCode({ code: 'SAVE500', subtotalMinor: 250_000 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discountMinor).toBe(50_000);
    expect(result.totalMinor).toBe(200_000);
  });

  it('rejects unknown and expired codes', () => {
    expect(validateDiscountCode({ code: 'NOPE', subtotalMinor: 200_000 })).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(
      validateDiscountCode({
        code: 'EXPIRED',
        subtotalMinor: 200_000,
        now: new Date('2026-01-01'),
      }),
    ).toEqual({ ok: false, error: 'expired' });
  });

  it('caps fixed discount at subtotal', () => {
    const def = BUNDLED_DISCOUNT_CODES.find((c) => c.code === 'SAVE500')!;
    expect(calculateDiscountMinor(def, 30_000)).toBe(30_000);
  });
});
