import type { ScanImageIntent, ScanMode } from '@allerguide/ai';
import { YC_SCAN_INTENT_LLM_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

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

  try {
    const token = await getBackendAuthToken();
    const response = await fetch(`${API_BASE}/api/scan/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        text: input.text.trim().slice(0, 1200),
        fallbackMode: input.fallbackMode ?? 'product',
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      intent?: ScanImageIntent;
      mode?: ScanMode;
      source?: 'llm' | 'heuristic';
    };

    if (!response.ok || !payload.ok || !payload.intent || !payload.mode) return null;

    return {
      intent: payload.intent,
      mode: payload.mode,
      source: payload.source ?? 'llm',
    };
  } catch {
    return null;
  }
}
