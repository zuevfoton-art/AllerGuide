/**
 * Encrypted, JWT-authenticated PostgreSQL cloud backup. Enable with
 * EXPO_PUBLIC_CLOUD_SYNC=true (requires backend auth + a running API).
 */
export const CLOUD_SYNC_ENABLED = process.env.EXPO_PUBLIC_CLOUD_SYNC === 'true';

/** Smart LLM scan via AllerGuide API (/api/scan). Requires AI_SCAN_ENABLED on server. */
export const AI_SCAN_ENABLED = process.env.EXPO_PUBLIC_AI_SCAN_ENABLED === 'true';

/**
 * Option D: multimodal dish photo → name + likely ingredients via
 * POST /api/scan/dish-vision. Used when OCR finds little/no text (plate-only photo).
 * On by default (core smart scanner). Requires AI_DISH_VISION_ENABLED + AI_SCAN_ENABLED on the API.
 */
export const AI_DISH_VISION_ENABLED = process.env.EXPO_PUBLIC_AI_DISH_VISION === 'true';

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
 * Optional LLM dish/product resolve via POST /api/dishes/resolve.
 * Requires DISH_LLM_ENABLED + AI_SCAN_ENABLED on the API.
 */
export const DISH_LLM_ENABLED = process.env.EXPO_PUBLIC_DISH_LLM === 'true';

/**
 * Phase 3: Yandex SpeechKit STT via POST /api/stt when OS speech recognition
 * is unavailable. Offline / flag-off keeps expo-speech-recognition only.
 */
export const YC_STT_ENABLED = process.env.EXPO_PUBLIC_YC_STT === 'true';

/**
 * Cloud mic capture (expo-audio → /api/stt) as a fallback when OS speech
 * recognition is unavailable. Requires both `EXPO_PUBLIC_YC_STT` and
 * `EXPO_PUBLIC_YC_STT_MIC`. Staging enables the mic flag after the SDK 54
 * upgrade + `expo-modules-core@3.0.30` patch (LazyObject null-guard + Promise
 * double-settle; see expo#43094). OS speech remains the primary path.
 */
export const YC_STT_MIC_ENABLED =
  process.env.EXPO_PUBLIC_YC_STT === 'true' && process.env.EXPO_PUBLIC_YC_STT_MIC === 'true';

/** Use PostgreSQL backend for users and profiles (JWT auth). */
export const BACKEND_AUTH_ENABLED = process.env.EXPO_PUBLIC_BACKEND_AUTH === 'true';

/** Look up barcodes in the backend product catalog before Open Food Facts. */
export const PRODUCT_DB_ENABLED = process.env.EXPO_PUBLIC_PRODUCT_DB === 'true';

/**
 * Diary «Лекарство» photo recognition via POST /api/medicines/recognize.
 * Catalog-first lookup + optional VL. Offline OCR/demo parse remains when off.
 */
export const MEDICINE_DB_ENABLED = process.env.EXPO_PUBLIC_MEDICINE_DB === 'true';

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
 * Phase 2: Map tab uses Google Pollen forecast as the primary numeric/forecast feed.
 * Wellness / Home stay on Open-Meteo. Requires API `/api/pollen/forecast`.
 */
export const MAP_POLLEN_GOOGLE_PRIMARY =
  process.env.EXPO_PUBLIC_MAP_POLLEN_GOOGLE_PRIMARY === 'true';

/**
 * Phase 3a: near-real-time pollen plume animation overlay on the interactive map.
 */
export const MAP_POLLEN_PLUME_ENABLED =
  process.env.EXPO_PUBLIC_MAP_POLLEN_PLUME === 'true';

/**
 * Phase 4: interactive Yandex basemap via API-hosted JS embed.
 * Pollen numbers/plume stay on Google/OM; requires API YANDEX_MAPS_* + EXPO_PUBLIC_API_URL.
 */
export const YANDEX_MAP_INTERACTIVE_ENABLED =
  process.env.EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE === 'true';

/**
 * Unset / empty = on. Explicit `false` or `off` disables.
 * Used for map Places and Air Quality, which stay on unless opted out.
 */
export function isDefaultOnPublicFlag(value: string | undefined): boolean {
  return value !== 'false' && value !== 'off';
}

/**
 * Fetch live restaurants / medical POIs via the API Places proxy.
 * On by default; offline catalog + ADAIR remain the fallback when off or unreachable.
 */
export const MAP_PLACES_ENABLED = isDefaultOnPublicFlag(
  process.env.EXPO_PUBLIC_MAP_PLACES ?? process.env.EXPO_PUBLIC_LIVE_MAP,
);

/**
 * Google Air Quality API enrichment (UAQI + health recommendations) via the
 * API proxy `/api/air-quality/*`. On by default; Open-Meteo stays the
 * offline-safe fallback and keeps feeding the wellness score.
 */
export const AIR_QUALITY_GOOGLE_ENABLED = isDefaultOnPublicFlag(
  process.env.EXPO_PUBLIC_AIR_QUALITY,
);

/**
 * Fetch the live Market catalog from GET /api/market/catalog when an API URL
 * is configured. Offline last-good snapshot + bundled seed remain the fallback.
 * Explicit `false` / `off` keeps the device on the bundled seed only.
 */
export const MARKET_LIVE_CATALOG_ENABLED = isDefaultOnPublicFlag(
  process.env.EXPO_PUBLIC_MARKET_LIVE_CATALOG,
);

/**
 * Show curated OTC pharmacy cards on Market. Off only when explicitly disabled.
 */
export const MARKET_MEDICINES_ENABLED = isDefaultOnPublicFlag(
  process.env.EXPO_PUBLIC_MARKET_MEDICINES,
);
