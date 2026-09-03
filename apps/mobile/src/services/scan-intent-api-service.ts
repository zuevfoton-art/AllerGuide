import type { ScanImageIntent, ScanMode } from '@allerguide/ai';
import { YC_SCAN_INTENT_LLM_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { enrichmentPost } from '@/src/services/enrichment-api';

export type CloudScanIntentResult = {
  intent: ScanImageIntent;
  mode: ScanMode;
  source: 'llm' | 'heuristic';
};

/**
 * Option B — classify OCR text via /api/scan/intent.
 * Returns null when the flag is off or the API is unavailable (caller uses heuristic).
 */
export async function classifyScanIntentViaApi(input: {
  text: string;
  fallbackMode?: ScanMode;
}): Promise<CloudScanIntentResult | null> {
  if (!YC_SCAN_INTENT_LLM_ENABLED) return null;
  if (!input.text.trim()) return null;

  const token = await getBackendAuthToken();
  const result = await enrichmentPost<{
    ok?: boolean;
    intent?: ScanImageIntent;
    mode?: ScanMode;
    source?: 'llm' | 'heuristic';
  }>(
    '/api/scan/intent',
    {
      text: input.text.trim().slice(0, 1200),
      fallbackMode: input.fallbackMode ?? 'product',
    },
    { token, context: 'classifyScanIntentViaApi' },
  );

  if (!result.ok || !result.data.ok || !result.data.intent || !result.data.mode) {
    return null;
  }

  return {
    intent: result.data.intent,
    mode: result.data.mode,
    source: result.data.source ?? 'llm',
  };
}
