export type DiscountType = 'percent' | 'fixed';

export type DiscountValidationError =
  | 'empty_code'
  | 'not_found'
  | 'expired'
  | 'below_minimum'
  | 'invalid_subtotal';

export interface DiscountDefinition {
  code: string;
  type: DiscountType;
  /** Percent 1–100 or fixed amount in minor currency units (kopecks). */
  amount: number;
  minSubtotalMinor?: number;
  expiresAt?: string;
  description?: string;
}

export interface DiscountValidationInput {
  code: string;
  subtotalMinor: number;
  now?: Date;
}

export type DiscountValidationSuccess = {
  ok: true;
  code: string;
  type: DiscountType;
  amount: number;
  discountMinor: number;
  totalMinor: number;
  description?: string;
};

export type DiscountValidationFailure = {
  ok: false;
  error: DiscountValidationError;
};

export type DiscountValidationResult = DiscountValidationSuccess | DiscountValidationFailure;

/** Bundled promo codes — offline source of truth; API mirrors this list. */
export const BUNDLED_DISCOUNT_CODES: DiscountDefinition[] = [
  {
    code: 'WELCOME10',
    type: 'percent',
    amount: 10,
    minSubtotalMinor: 100_000,
    description: '10% off orders from 1 000 ₽',
  },
  {
    code: 'SAVE500',
    type: 'fixed',
    amount: 50_000,
    minSubtotalMinor: 200_000,
    description: '500 ₽ off orders from 2 000 ₽',
  },
  {
    code: 'EXPIRED',
    type: 'percent',
    amount: 15,
    expiresAt: '2020-01-01T00:00:00.000Z',
    description: 'Expired sample code for tests',
  },
];

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

export function findDiscountDefinition(
  code: string,
  catalog: DiscountDefinition[] = BUNDLED_DISCOUNT_CODES,
): DiscountDefinition | undefined {
  const normalized = normalizeDiscountCode(code);
  if (!normalized) return undefined;
  return catalog.find((entry) => entry.code === normalized);
}

export function calculateDiscountMinor(
  definition: DiscountDefinition,
  subtotalMinor: number,
): number {
  if (subtotalMinor <= 0) return 0;
  if (definition.type === 'percent') {
    const pct = Math.min(100, Math.max(0, definition.amount));
    return Math.min(subtotalMinor, Math.round((subtotalMinor * pct) / 100));
  }
  return Math.min(subtotalMinor, Math.max(0, definition.amount));
}

export function validateDiscountCode(
  input: DiscountValidationInput,
  catalog: DiscountDefinition[] = BUNDLED_DISCOUNT_CODES,
): DiscountValidationResult {
  const code = normalizeDiscountCode(input.code);
  if (!code) return { ok: false, error: 'empty_code' };
  if (!Number.isFinite(input.subtotalMinor) || input.subtotalMinor < 0) {
    return { ok: false, error: 'invalid_subtotal' };
  }

  const definition = findDiscountDefinition(code, catalog);
  if (!definition) return { ok: false, error: 'not_found' };

  const now = input.now ?? new Date();
  if (definition.expiresAt && now.getTime() > new Date(definition.expiresAt).getTime()) {
    return { ok: false, error: 'expired' };
  }

  if (
    definition.minSubtotalMinor != null &&
    input.subtotalMinor < definition.minSubtotalMinor
  ) {
    return { ok: false, error: 'below_minimum' };
  }

  const discountMinor = calculateDiscountMinor(definition, input.subtotalMinor);
  return {
    ok: true,
    code: definition.code,
    type: definition.type,
    amount: definition.amount,
    discountMinor,
    totalMinor: Math.max(0, input.subtotalMinor - discountMinor),
    description: definition.description,
  };
}
