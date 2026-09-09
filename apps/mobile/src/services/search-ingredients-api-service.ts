import { YC_SEARCH_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { enrichmentPost } from '@/src/services/enrichment-api';

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

  const token = await getBackendAuthToken();
  const result = await enrichmentPost<{
    ok?: boolean;
    query?: string;
    productName?: string;
    ingredients?: string;
    source?: 'yandex_gen' | 'yandex_web';
  }>('/api/search/ingredients', { query: q }, { token, context: 'searchIngredientsViaApi' });

  if (!result.ok || !result.data.ok || !result.data.ingredients?.trim()) {
    return null;
  }

  return {
    query: result.data.query ?? q,
    productName: result.data.productName ?? q,
    ingredients: result.data.ingredients.trim(),
    source: result.data.source ?? 'yandex_web',
  };
}
