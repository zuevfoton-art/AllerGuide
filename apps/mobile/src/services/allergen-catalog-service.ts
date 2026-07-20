import { getAllAllergens, type AllergenRecord } from '@allerguide/core';
import { getApiBaseUrl } from '@/src/services/api-client';
import { logCaughtError } from '@/src/services/error-reporting';
import {
  getCachedAllergenCatalog,
  getResolvedAllergenCatalog,
  saveCachedAllergenCatalog,
} from '@/src/services/catalog-cache-service';

interface AllergenApiResponse {
  ok?: boolean;
  source?: 'db' | 'static';
  allergens?: AllergenRecord[];
}

/** Returns catalog allergens from offline cache, refreshing from API when stale. */
export async function resolveAllergenCatalog(): Promise<{
  allergens: AllergenRecord[];
  source: 'cache' | 'api' | 'static';
}> {
  const cached = getCachedAllergenCatalog();
  if (cached) {
    return { allergens: cached.allergens, source: 'cache' };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/allergens`);
    if (response.ok) {
      const data = (await response.json()) as AllergenApiResponse;
      if (data.ok && Array.isArray(data.allergens) && data.allergens.length > 0) {
        const source = data.source === 'db' ? 'db' : 'static';
        saveCachedAllergenCatalog(data.allergens, source);
        return { allergens: data.allergens, source: 'api' };
      }
    }
  } catch (error) {
    logCaughtError('resolveAllergenCatalog', error, { level: 'warn' });
  }

  const staticAllergens = getAllAllergens();
  saveCachedAllergenCatalog(staticAllergens, 'static');
  return { allergens: staticAllergens, source: 'static' };
}

/** Synchronous read for UI that cannot await (uses cache or static fallback). */
export function getAllergenCatalogSnapshot(): AllergenRecord[] {
  return getResolvedAllergenCatalog();
}

/** Warm allergen cache in the background (e.g. on app start). */
export function warmAllergenCatalogCache(): void {
  void resolveAllergenCatalog();
}
