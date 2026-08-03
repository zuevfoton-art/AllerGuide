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

/**
 * Option B: YandexGPT classifies OCR snippet (label/menu vs visual product)
 * via POST /api/scan/intent. Falls back to local heuristic when off/unavailable.
 */
export const YC_SCAN_INTENT_LLM_ENABLED =
  process.env.EXPO_PUBLIC_YC_SCAN_INTENT_LLM === 'true';

/**
 * Option C: Yandex Search API ingredients lookup via POST /api/search/ingredients
 * when Open Food Facts / local catalog miss.
 */
export const YC_SEARCH_ENABLED = process.env.EXPO_PUBLIC_YC_SEARCH === 'true';

/**
 * Phase 3: Yandex SpeechKit STT via POST /api/stt when OS speech recognition
 * is unavailable. Offline / flag-off keeps expo-speech-recognition only.
 */
export const YC_STT_ENABLED = process.env.EXPO_PUBLIC_YC_STT === 'true';

/**
 * Cloud mic capture (expo-audio → /api/stt) as a fallback when OS speech
 * recognition is unavailable. Default OFF: the expo AV/audio native module
 * fails to install JSI bindings on the SDK 53 old-architecture release build
 * and hard-crashes (native SIGSEGV in libexpo-modules-core.so) on first use.
 * OS speech recognition covers devices with Google/Samsung recognizers.
 */
export const YC_STT_MIC_ENABLED =
  process.env.EXPO_PUBLIC_YC_STT === 'true' && process.env.EXPO_PUBLIC_YC_STT_MIC === 'true';

/** Use PostgreSQL backend for users and profiles (JWT auth). */
export const BACKEND_AUTH_ENABLED = process.env.EXPO_PUBLIC_BACKEND_AUTH === 'true';

/** Look up barcodes in the backend product catalog before Open Food Facts. */
export const PRODUCT_DB_ENABLED = process.env.EXPO_PUBLIC_PRODUCT_DB === 'true';

/**
 * Google Maps basemap + Google Pollen UPI tiles on the pollen layer.
 * The Yandex/Open-Meteo view remains the default and offline-safe fallback.
 */
export const GOOGLE_POLLEN_HEATMAP_ENABLED =
  process.env.EXPO_PUBLIC_POLLEN_HEATMAP === 'google';

/**
 * Prefer Google Maps as the primary interactive basemap for the unified map tab
 * when a Maps API key is present (pins + optional heatmap).
 */
export const GOOGLE_MAP_PRIMARY_ENABLED =
  process.env.EXPO_PUBLIC_GOOGLE_MAP_PRIMARY === 'true';

/**
 * Fetch live restaurants / medical POIs via the API Places proxy.
 * Offline catalog + ADAIR remain the fallback when false or unreachable.
 */
export const MAP_PLACES_ENABLED =
  process.env.EXPO_PUBLIC_MAP_PLACES === 'true' ||
  process.env.EXPO_PUBLIC_LIVE_MAP === 'true';
