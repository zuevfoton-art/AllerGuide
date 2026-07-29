import { YC_SEARCH_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export type CloudIngredientsSearchResult = {
  query: string;
  productName: string;
  ingredients: string;
  source: 'yandex_gen' | 'yandex_web';
};

/**
 * Option C — Yandex Search ingredients when OFF/catalog miss.
 * Returns null when the flag is off or search finds nothing.
 */
export async function searchIngredientsViaApi(
  query: string,
): Promise<CloudIngredientsSearchResult | null> {
  if (!YC_SEARCH_ENABLED) return null;
  const q = query.trim();
  if (q.length < 2) return null;

  try {
    const token = await getBackendAuthToken();
    const response = await fetch(`${API_BASE}/api/search/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: q }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      query?: string;
      productName?: string;
      ingredients?: string;
      source?: 'yandex_gen' | 'yandex_web';
    };

    if (!response.ok || !payload.ok || !payload.ingredients?.trim()) return null;

    return {
      query: payload.query ?? q,
      productName: payload.productName ?? q,
      ingredients: payload.ingredients.trim(),
      source: payload.source ?? 'yandex_web',
    };
  } catch {
    return null;
  }
}
