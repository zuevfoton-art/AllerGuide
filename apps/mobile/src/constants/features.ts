/**
 * Encrypted, JWT-authenticated PostgreSQL cloud backup. Enable with
 * EXPO_PUBLIC_CLOUD_SYNC=true (requires backend auth + a running API).
 */
export const CLOUD_SYNC_ENABLED = process.env.EXPO_PUBLIC_CLOUD_SYNC === 'true';

/** Smart LLM scan via AllerGuide API (/api/scan). Requires AI_SCAN_ENABLED on server. */
export const AI_SCAN_ENABLED = process.env.EXPO_PUBLIC_AI_SCAN_ENABLED === 'true';

/** Use PostgreSQL backend for users and profiles (JWT auth). */
export const BACKEND_AUTH_ENABLED = process.env.EXPO_PUBLIC_BACKEND_AUTH === 'true';

/** Look up barcodes in the backend product catalog before Open Food Facts. */
export const PRODUCT_DB_ENABLED = process.env.EXPO_PUBLIC_PRODUCT_DB === 'true';

/** Marketplace cart + checkout with promo codes (offline-capable). */
export const MARKETPLACE_CHECKOUT_ENABLED =
  process.env.EXPO_PUBLIC_MARKETPLACE_CHECKOUT === 'true' ||
  process.env.EXPO_PUBLIC_MAESTRO_TEST_CHECKOUT === 'true';

/** Validate promo codes via API when URL is configured (falls back to core offline). */
export const MARKETPLACE_CHECKOUT_API_ENABLED =
  MARKETPLACE_CHECKOUT_ENABLED && Boolean(process.env.EXPO_PUBLIC_API_URL);
