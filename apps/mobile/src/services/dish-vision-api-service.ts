import type { DishVisionResult } from '@allerguide/ai';
import { AI_DISH_VISION_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface DishVisionApiSuccess {
  ok: true;
  result: DishVisionResult;
  cached?: boolean;
}

export interface DishVisionApiFailure {
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
 * Option D: multimodal dish photo → name + likely ingredients.
 * Returns null when the feature flag is off (caller keeps OCR / lookup path).
 */
export async function recognizeDishViaApi(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<DishVisionApiSuccess | DishVisionApiFailure | null> {
  if (!AI_DISH_VISION_ENABLED) return null;

  const token = await getBackendAuthToken();
  const response = await fetch(`${API_BASE}/api/scan/dish-vision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      imageBase64: stripDataUrlPrefix(input.imageBase64),
      mimeType: input.mimeType || 'image/jpeg',
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: DishVisionResult;
    cached?: boolean;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.result) {
    return {
      ok: false,
      error: payload.error || `Dish vision HTTP ${response.status}`,
      status: response.status,
    };
  }

  return {
    ok: true,
    result: payload.result,
    cached: payload.cached,
  };
}
