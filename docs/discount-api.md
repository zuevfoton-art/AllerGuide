# Discount code API

Promo validation for marketplace checkout preview (OUT-05). Domain logic lives in `@allerguide/core` (`discount.ts`); the API mirrors bundled codes for optional online validation.

## Endpoint

### `POST /api/discounts/validate`

Validates a promo code against an order subtotal in minor currency units (kopecks for `RUB`).

**Request body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | yes | Promo code (case-insensitive) |
| `subtotalMinor` | number | yes | Order subtotal in minor units (≥ 0) |
| `currency` | string | no | Display currency hint (default `RUB`) |

**Success — `200 OK`**

```json
{
  "ok": true,
  "code": "WELCOME10",
  "type": "percent",
  "amount": 10,
  "discountMinor": 15000,
  "totalMinor": 135000,
  "subtotalMinor": 150000,
  "currency": "RUB",
  "description": "10% off orders from 1 000 ₽"
}
```

**Errors**

| HTTP | `error` | When |
|------|---------|------|
| 400 | `invalid_subtotal` | `subtotalMinor` missing or negative |
| 400 | `empty_code` | Blank code |
| 404 | `not_found` | Unknown code |
| 404 | `expired` | Code past `expiresAt` |
| 404 | `below_minimum` | Subtotal below `minSubtotalMinor` |

```json
{ "ok": false, "error": "not_found" }
```

## Bundled codes (offline + API)

| Code | Type | Value | Min subtotal (minor) | Notes |
|------|------|-------|----------------------|-------|
| `WELCOME10` | percent | 10% | 100_000 (1 000 ₽) | |
| `SAVE500` | fixed | 50_000 (500 ₽) | 200_000 (2 000 ₽) | |
| `EXPIRED` | percent | 15% | — | Test fixture (expired 2020-01-01) |

Source: `packages/core/src/discount.ts` → `BUNDLED_DISCOUNT_CODES`.

## Mobile integration

| Flag | Default | Purpose |
|------|---------|---------|
| `EXPO_PUBLIC_MARKETPLACE_CHECKOUT` | off | Cart + checkout UI |
| `EXPO_PUBLIC_MAESTRO_TEST_CHECKOUT` | off | Enables checkout in Maestro CI builds |
| `EXPO_PUBLIC_API_URL` | — | When set with checkout on, mobile may call API via `discount-service` |

Offline-first: mobile always validates through `@allerguide/core` locally; API call is optional enrichment when `EXPO_PUBLIC_API_URL` is configured.

## Tests

| Layer | File |
|-------|------|
| Core unit | `packages/core/src/discount.test.ts`, `checkout.test.ts` |
| API unit | `apps/api/src/routes/discount.test.ts` |
| API integration | `apps/api/src/routes/discount.integration.test.ts` |
| Mobile unit | `apps/mobile/src/services/discount-service.test.ts` |
| E2E (Maestro) | `apps/mobile/.maestro/flows/market-checkout-discount-smoke.yaml` |

Run API integration suite:

```bash
pnpm --filter api test:integration
```

## Repository scan (other branches)

As of 2026-07-14, no other branch in `origin/*` contains discount/checkout API implementation. Marketplace checkout was listed as **OUT-05** (not implemented) in `docs/functional-requirements.md` until this feature branch.
