import { DISH_LLM_ENABLED } from '@/src/constants/features';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { enrichmentPost } from '@/src/services/enrichment-api';
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

  const token = await getBackendAuthToken();
  const result = await enrichmentPost<{
    ok?: boolean;
    canonicalName?: string;
    dishId?: string;
    ingredients?: string[];
    components?: DishComponentDef[];
    source?: 'llm' | 'local';
  }>('/api/dishes/resolve', { query: q }, { token, context: 'resolveDishViaLlm' });

  if (!result.ok || !result.data.ok || !result.data.canonicalName) {
    return null;
  }

  const { canonicalName, dishId, ingredients: ingredientList, components: componentList, source } =
    result.data;
  const components = componentList ?? [];
  const ingredients =
    ingredientList?.join(', ') || components.map((item) => item.nameRu).join(', ');
  if (!ingredients.trim()) return null;

  return {
    canonicalName,
    dishId: dishId ?? `llm:${canonicalName}`,
    ingredients,
    components,
    source: source ?? 'llm',
  };
}
