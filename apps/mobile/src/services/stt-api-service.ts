import { YC_STT_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

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
  const response = await fetch(`${API_BASE}/api/stt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      audioBase64: stripDataUrlPrefix(input.audioBase64),
      lang: input.lang ?? 'ru-RU',
      format: input.format ?? 'oggopus',
      sampleRateHertz: input.sampleRateHertz,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    text?: string;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.text?.trim()) {
    return {
      ok: false,
      error: payload.error || `STT HTTP ${response.status}`,
      status: response.status,
    };
  }

  return { ok: true, text: payload.text.trim() };
}
