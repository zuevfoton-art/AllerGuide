import {
  validateDiscountCode,
  type DiscountValidationResult,
} from '@allerguide/core';
import { MARKETPLACE_CHECKOUT_API_ENABLED } from '@/src/constants/features';
import { apiRequest } from '@/src/services/api-client';

type ApiDiscountSuccess = {
  ok: true;
  code: string;
  type: 'percent' | 'fixed';
  amount: number;
  discountMinor: number;
  totalMinor: number;
  description?: string;
};

function mapApiError(error: string): DiscountValidationResult {
  if (
    error === 'not_found' ||
    error === 'expired' ||
    error === 'below_minimum' ||
    error === 'empty_code' ||
    error === 'invalid_subtotal'
  ) {
    return { ok: false, error };
  }
  return { ok: false, error: 'not_found' };
}

/** Offline-first validation; optional API mirror when checkout API flag is on. */
export async function validateCheckoutDiscount(
  code: string,
  subtotalMinor: number,
): Promise<DiscountValidationResult> {
  const local = validateDiscountCode({ code, subtotalMinor });
  if (!MARKETPLACE_CHECKOUT_API_ENABLED) return local;

  const remote = await apiRequest<ApiDiscountSuccess | { ok: false; error: string }>(
    '/api/discounts/validate',
    {
      method: 'POST',
      body: { code, subtotalMinor, currency: 'RUB' },
    },
  );

  if (!remote.ok) {
    if (remote.status === 0) return local;
    return mapApiError(remote.error);
  }

  const data = remote.data;
  if (!data.ok) return mapApiError(data.error);

  return {
    ok: true,
    code: data.code,
    type: data.type,
    amount: data.amount,
    discountMinor: data.discountMinor,
    totalMinor: data.totalMinor,
    description: data.description,
  };
}
