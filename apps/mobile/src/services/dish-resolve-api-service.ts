import { DISH_LLM_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { getApiBaseUrl } from '@/src/services/api-client';
import type { DishComponentDef } from '@allerguide/core';

export type CloudDishResolveResult = {
  canonicalName: string;
  dishId: string;
  ingredients: string;
  components: DishComponentDef[];
  source: 'llm' | 'local';
};

export async function resolveDishViaLlm(
  query: string,
): Promise<CloudDishResolveResult | null> {
  if (!DISH_LLM_ENABLED) return null;
  const q = query.trim();
  if (q.length < 2) return null;

  try {
    const token = await getBackendAuthToken();
    const response = await fetch(`${getApiBaseUrl()}/api/dishes/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: q }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      canonicalName?: string;
      dishId?: string;
      ingredients?: string[];
      components?: DishComponentDef[];
      source?: 'llm' | 'local';
    };
    if (!response.ok || !payload.ok || !payload.canonicalName) return null;
    const components = payload.components ?? [];
    const ingredients =
      payload.ingredients?.join(', ') || components.map((item) => item.nameRu).join(', ');
    if (!ingredients.trim()) return null;
    return {
      canonicalName: payload.canonicalName,
      dishId: payload.dishId ?? `llm:${payload.canonicalName}`,
      ingredients,
      components,
      source: payload.source ?? 'llm',
    };
  } catch {
    return null;
  }
}
