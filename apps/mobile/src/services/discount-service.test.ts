import { describe, expect, it, vi } from 'vitest';
import { validateCheckoutDiscount } from './discount-service';

vi.mock('@/src/constants/features', () => ({
  MARKETPLACE_CHECKOUT_API_ENABLED: false,
}));

describe('discount-service', () => {
  it('validates bundled codes offline', async () => {
    const result = await validateCheckoutDiscount('WELCOME10', 150_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discountMinor).toBe(15_000);
  });
});
