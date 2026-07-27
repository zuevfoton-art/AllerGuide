/**
 * Encrypted, JWT-authenticated PostgreSQL cloud backup. Enable with
 * EXPO_PUBLIC_CLOUD_SYNC=true (requires backend auth + a running API).
 */
export const CLOUD_SYNC_ENABLED = process.env.EXPO_PUBLIC_CLOUD_SYNC === 'true';

/** Smart LLM scan via AllerGuide API (/api/scan). Requires AI_SCAN_ENABLED on server. */
export const AI_SCAN_ENABLED = process.env.EXPO_PUBLIC_AI_SCAN_ENABLED === 'true';

/**
 * Cloud Vision OCR via API (/api/ocr → Yandex Vision). Offline demo OCR remains
 * when false or when the API is unreachable.
 */
export const YC_OCR_ENABLED = process.env.EXPO_PUBLIC_YC_OCR === 'true';

/** Use PostgreSQL backend for users and profiles (JWT auth). */
export const BACKEND_AUTH_ENABLED = process.env.EXPO_PUBLIC_BACKEND_AUTH === 'true';

/** Look up barcodes in the backend product catalog before Open Food Facts. */
export const PRODUCT_DB_ENABLED = process.env.EXPO_PUBLIC_PRODUCT_DB === 'true';
