import { YC_OCR_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface CloudOcrSuccess {
  ok: true;
  text: string;
  fullText?: string;
}

export interface CloudOcrFailure {
  ok: false;
  error: string;
  status?: number;
}

function stripDataUrlPrefix(base64: string): string {
  const trimmed = base64.trim();
  const comma = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && comma >= 0) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

/**
 * Call staging/prod Vision OCR. Returns null when the feature flag is off
 * (caller should use demo / manual OCR).
 */
export async function recognizeImageViaApi(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<CloudOcrSuccess | CloudOcrFailure | null> {
  if (!YC_OCR_ENABLED) return null;

  const token = await getBackendAuthToken();
  const response = await fetch(`${API_BASE}/api/ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      imageBase64: stripDataUrlPrefix(input.imageBase64),
      mimeType: input.mimeType || 'image/jpeg',
      languageCodes: ['ru', 'en'],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    text?: string;
    fullText?: string;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.text?.trim()) {
    return {
      ok: false,
      error: payload.error || `OCR HTTP ${response.status}`,
      status: response.status,
    };
  }

  return {
    ok: true,
    text: payload.text.trim(),
    fullText: payload.fullText,
  };
}
