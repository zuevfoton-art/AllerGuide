/** Cloud backup is disabled until authenticated PostgreSQL sync ships in v1.1. */
export const CLOUD_SYNC_ENABLED = false;

/** Smart LLM scan via AllerGuide API (/api/scan). Requires AI_SCAN_ENABLED on server. */
export const AI_SCAN_ENABLED = process.env.EXPO_PUBLIC_AI_SCAN_ENABLED === 'true';

/** Use PostgreSQL backend for users and profiles (JWT auth). */
export const BACKEND_AUTH_ENABLED = process.env.EXPO_PUBLIC_BACKEND_AUTH === 'true';
