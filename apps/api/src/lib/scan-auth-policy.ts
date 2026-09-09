const BILLABLE_AI_FLAGS = [
  'AI_SCAN_ENABLED',
  'DISH_LLM_ENABLED',
  'AI_DISH_VISION_ENABLED',
  'AI_MEDICINE_VISION_ENABLED',
  'YC_OCR_ENABLED',
  'YC_SCAN_INTENT_LLM',
  'YC_SEARCH_ENABLED',
  'YC_STT_ENABLED',
] as const;

export function isBillableAiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return BILLABLE_AI_FLAGS.some((flag) => env[flag] === 'true');
}

/**
 * Staging/production must not expose anonymous LLM/OCR/STT when those
 * features are on. Local/dev (`NODE_ENV !== 'production'`) may keep
 * `SCAN_REQUIRE_AUTH=false` for offline work.
 */
export function assertScanAuthPolicy(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  if (!isBillableAiEnabled(env)) return;
  if (env.SCAN_REQUIRE_AUTH === 'true') return;

  throw new Error(
    'SCAN_REQUIRE_AUTH must be true when AI features are enabled in production',
  );
}
