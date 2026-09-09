import type { DishVisionResult } from '@allerguide/ai';
import { AI_DISH_VISION_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { enrichmentPost } from '@/src/services/enrichment-api';

export interface DishVisionApiSuccess {
  ok: true;
  result: DishVisionResult;
  cached?: boolean;
}

export interface DishVisionApiFailure {
  ok: false;
  error: string;
  status?: number;
  /** Upstream VL HTTP status when API returns 502 with providerStatus. */
  providerStatus?: number;
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
  const result = await enrichmentPost<{
    ok?: boolean;
    result?: DishVisionResult;
    cached?: boolean;
    error?: string;
    providerStatus?: number;
  }>(
    '/api/scan/dish-vision',
    {
      imageBase64: stripDataUrlPrefix(input.imageBase64),
      mimeType: input.mimeType || 'image/jpeg',
    },
    { token, context: 'recognizeDishViaApi' },
  );

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      status: result.status,
    };
  }

  const payload = result.data;
  if (!payload.ok || !payload.result) {
    return {
      ok: false,
      error: payload.error || `Dish vision HTTP ${result.status}`,
      status: result.status,
      ...(typeof payload.providerStatus === 'number'
        ? { providerStatus: payload.providerStatus }
        : {}),
    };
  }

  return {
    ok: true,
    result: payload.result,
    cached: payload.cached,
  };
}
