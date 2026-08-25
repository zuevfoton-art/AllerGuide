import { DISH_COMPONENTS_BY_ID } from '@allerguide/core';

export type DishResolveKind = 'dish' | 'product';

export type DishResolveLlmResult = {
  canonicalName: string;
  kind: DishResolveKind;
  ingredients: string[];
  allergenHints: string[];
};

const COMPONENT_IDS = Object.keys(DISH_COMPONENTS_BY_ID).join(', ');

export function buildDishResolvePrompt(query: string): string {
  return [
    'Normalize a user food/product query and list typical ingredients.',
    'Reply with a single JSON object only:',
    '{"canonicalName":"string","kind":"dish"|"product","ingredients":["id"],"allergenHints":["id"]}',
    `ingredients must be chosen only from: ${COMPONENT_IDS}`,
    'allergenHints are optional canonical allergen ids (milk, eggs, wheat-gluten, ...).',
    `Query: ${query.trim().slice(0, 160)}`,
  ].join('\n');
}

export function parseDishResolveLlm(raw: string | null | undefined): DishResolveLlmResult | null {
  if (!raw?.trim()) return null;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<DishResolveLlmResult>;
    const canonicalName = parsed.canonicalName?.trim() ?? '';
    if (canonicalName.length < 2) return null;
    const kind: DishResolveKind = parsed.kind === 'product' ? 'product' : 'dish';
    const ingredients = (parsed.ingredients ?? []).filter(
      (id): id is string => typeof id === 'string' && Boolean(DISH_COMPONENTS_BY_ID[id]),
    );
    const allergenHints = (parsed.allergenHints ?? []).filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
    return { canonicalName, kind, ingredients, allergenHints };
  } catch {
    return null;
  }
}
