import { YC_STT_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { enrichmentPost } from '@/src/services/enrichment-api';

export type CloudSttSuccess = { ok: true; text: string };
export type CloudSttFailure = { ok: false; error: string; status?: number };

function stripDataUrlPrefix(base64: string): string {
  const trimmed = base64.trim();
  const comma = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && comma >= 0) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

/**
 * Phase 3 — SpeechKit STT via /api/stt.
 * Returns null when the feature flag is off (caller keeps OS speech recognition).
 */
export async function recognizeSpeechViaApi(input: {
  audioBase64: string;
  lang?: string;
  format?: 'lpcm' | 'oggopus';
  sampleRateHertz?: number;
}): Promise<CloudSttSuccess | CloudSttFailure | null> {
  if (!YC_STT_ENABLED) return null;

  const token = await getBackendAuthToken();
  const result = await enrichmentPost<{
    ok?: boolean;
    text?: string;
    error?: string;
  }>(
    '/api/stt',
    {
      audioBase64: stripDataUrlPrefix(input.audioBase64),
      lang: input.lang ?? 'ru-RU',
      format: input.format ?? 'oggopus',
      sampleRateHertz: input.sampleRateHertz,
    },
    { token, context: 'recognizeSpeechViaApi' },
  );

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      status: result.status,
    };
  }

  const payload = result.data;
  if (!payload.ok || !payload.text?.trim()) {
    return {
      ok: false,
      error: payload.error || `STT HTTP ${result.status}`,
      status: result.status,
    };
  }

  return { ok: true, text: payload.text.trim() };
}
