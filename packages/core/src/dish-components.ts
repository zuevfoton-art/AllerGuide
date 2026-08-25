import { findAllergenById } from './allergen-database';
import { mapExternalAllergenIds } from './allergen-aliases';
import { getCrossReactionsForSelection, type CrossReactionMatch } from './cross-reactions';
import {
  NAME_MATCH_MIN_SCORE,
  normalizeSearchText,
  scoreNameMatch,
  type NameMatchKind,
} from './name-matching';
import { parseProfileAllergenIds, resolveAllergenId } from './profile-allergens';

export type DishComponentDef = {
  /** Stable id within the catalog (often mirrors allergen id). */
  id: string;
  nameRu: string;
  /** Link to allergen-database id when applicable. */
  allergenId?: string;
};

export type DishRecipe = {
  id: string;
  /** RU/EN synonyms used for lookup in free-text food field. */
  names: string[];
  components: DishComponentDef[];
};

export type DishComponentMatch = DishComponentDef & {
  selected: boolean;
  conflict: 'direct' | 'cross' | null;
  conflictLabel?: string;
};

export type DishBreakdownResult = {
  dishId: string | null;
  dishName: string | null;
  components: DishComponentMatch[];
  allergensSummary: string;
  conflictsSummary: string;
};

const C = {
  beet: { id: 'beet', nameRu: 'свёкла' },
  cabbage: { id: 'cabbage', nameRu: 'капуста' },
  potato: { id: 'potato', nameRu: 'картофель' },
  carrot: { id: 'carrot', nameRu: 'морковь', allergenId: 'carrot' },
  onion: { id: 'onion', nameRu: 'лук' },
  tomato: { id: 'tomato', nameRu: 'томат', allergenId: 'tomato' },
  vinegar: { id: 'vinegar', nameRu: 'уксус' },
  beef: { id: 'beef', nameRu: 'говядина', allergenId: 'beef' },
  pork: { id: 'pork', nameRu: 'свинина', allergenId: 'pork' },
  chicken: { id: 'chicken', nameRu: 'курица', allergenId: 'chicken' },
  milk: { id: 'milk', nameRu: 'молоко', allergenId: 'milk' },
  eggs: { id: 'eggs', nameRu: 'яйца', allergenId: 'eggs' },
  wheat: { id: 'wheat', nameRu: 'пшеница/глютен', allergenId: 'wheat-gluten' },
  fish: { id: 'fish', nameRu: 'рыба', allergenId: 'fish' },
  seafood: { id: 'seafood', nameRu: 'морепродукты', allergenId: 'seafood' },
  soy: { id: 'soy', nameRu: 'соя', allergenId: 'soy' },
  peanut: { id: 'peanut', nameRu: 'арахис', allergenId: 'peanut' },
  treeNuts: { id: 'tree-nuts', nameRu: 'орехи', allergenId: 'tree-nuts' },
  sesame: { id: 'sesame', nameRu: 'кунжут', allergenId: 'sesame' },
  celery: { id: 'celery', nameRu: 'сельдерей', allergenId: 'celery' },
  mustard: { id: 'mustard', nameRu: 'горчица', allergenId: 'mustard' },
  apple: { id: 'apple', nameRu: 'яблоко', allergenId: 'apple' },
  banana: { id: 'banana', nameRu: 'банан', allergenId: 'banana' },
  citrus: { id: 'citrus', nameRu: 'цитрусовые', allergenId: 'citrus' },
  strawberry: { id: 'strawberry', nameRu: 'клубника', allergenId: 'strawberry' },
  honey: { id: 'honey', nameRu: 'мёд', allergenId: 'honey' },
  rice: { id: 'rice', nameRu: 'рис' },
  buckwheat: { id: 'buckwheat', nameRu: 'гречка' },
  cucumber: { id: 'cucumber', nameRu: 'огурец' },
  garlic: { id: 'garlic', nameRu: 'чеснок' },
  peas: { id: 'peas', nameRu: 'горох' },
  beans: { id: 'beans', nameRu: 'фасоль' },
  cheese: { id: 'cheese', nameRu: 'сыр', allergenId: 'milk' },
  butter: { id: 'butter', nameRu: 'масло сливочное', allergenId: 'milk' },
  mayo: { id: 'mayo', nameRu: 'майонез', allergenId: 'eggs' },
  sourCream: { id: 'sour-cream', nameRu: 'сметана', allergenId: 'milk' },
  greens: { id: 'greens', nameRu: 'зелень' },
  oil: { id: 'oil', nameRu: 'растительное масло' },
  sugar: { id: 'sugar', nameRu: 'сахар' },
  chocolate: { id: 'chocolate', nameRu: 'шоколад', allergenId: 'milk' },
  mushrooms: { id: 'mushrooms', nameRu: 'грибы' },
  pasta: { id: 'pasta', nameRu: 'макароны', allergenId: 'wheat-gluten' },
  bread: { id: 'bread', nameRu: 'хлеб', allergenId: 'wheat-gluten' },
  avocado: { id: 'avocado', nameRu: 'авокадо', allergenId: 'avocado' },
  kiwi: { id: 'kiwi', nameRu: 'киви', allergenId: 'kiwi' },
  chickpea: { id: 'chickpea', nameRu: 'нут' },
  tahini: { id: 'tahini', nameRu: 'тахин', allergenId: 'sesame' },
  lemon: { id: 'lemon', nameRu: 'лимон', allergenId: 'citrus' },
} as const satisfies Record<string, DishComponentDef>;

export const DISH_CATALOG: DishRecipe[] = [
  {
    id: 'borscht',
    names: ['борщ', 'борща', 'borscht', 'borsch'],
    components: [C.beet, C.cabbage, C.potato, C.carrot, C.tomato, C.onion, C.beef, C.sourCream, C.garlic],
  },
  {
    id: 'shchi',
    names: ['щи', 'кислые щи'],
    components: [C.cabbage, C.potato, C.carrot, C.onion, C.beef, C.sourCream],
  },
  {
    id: 'okroshka',
    names: ['окрошка'],
    components: [C.potato, C.cucumber, C.eggs, C.sourCream, C.greens, C.beef],
  },
  {
    id: 'solyanka',
    names: ['солянка'],
    components: [C.beef, C.pork, C.onion, C.tomato, C.cucumber, C.lemon],
  },
  {
    id: 'chicken-soup',
    names: ['куриный суп', 'суп с курицей', 'бульон куриный'],
    components: [C.chicken, C.carrot, C.onion, C.potato, C.greens],
  },
  {
    id: 'fish-soup',
    names: ['уха', 'рыбный суп'],
    components: [C.fish, C.potato, C.carrot, C.onion, C.greens],
  },
  {
    id: 'olivier',
    names: ['оливье', 'салат оливье'],
    components: [C.potato, C.carrot, C.eggs, C.peas, C.mayo, C.cucumber, C.chicken],
  },
  {
    id: 'vinaigrette',
    names: ['винегрет'],
    components: [C.beet, C.potato, C.carrot, C.cabbage, C.peas, C.oil, C.onion],
  },
  {
    id: 'caesar',
    names: ['цезарь', 'салат цезарь', 'caesar'],
    components: [C.chicken, C.cheese, C.eggs, C.bread, C.oil, C.garlic],
  },
  {
    id: 'greek-salad',
    names: ['греческий салат', 'греческий'],
    components: [C.tomato, C.cucumber, C.cheese, C.oil, C.onion],
  },
  {
    id: 'plov',
    names: ['плов'],
    components: [C.rice, C.carrot, C.onion, C.beef, C.garlic, C.oil],
  },
  {
    id: 'pelmeni',
    names: ['пельмени', 'пельмень'],
    components: [C.wheat, C.beef, C.pork, C.onion, C.eggs, C.sourCream],
  },
  {
    id: 'vareniki',
    names: ['вареники'],
    components: [C.wheat, C.potato, C.eggs, C.sourCream],
  },
  {
    id: 'blini',
    names: ['блины', 'блинчики', 'блины с'],
    components: [C.wheat, C.milk, C.eggs, C.butter],
  },
  {
    id: 'omelette',
    names: ['омлет', 'яичница', 'яичниц'],
    components: [C.eggs, C.milk, C.butter],
  },
  {
    id: 'syrniki',
    names: ['сырники'],
    components: [C.milk, C.eggs, C.wheat, C.sugar],
  },
  {
    id: 'milk-porridge',
    names: ['каша молочная', 'овсянка на молоке', 'манная каша', 'рисовая каша'],
    components: [C.milk, C.sugar, C.butter],
  },
  {
    id: 'buckwheat',
    names: ['гречка', 'гречневая каша'],
    components: [C.buckwheat, C.butter],
  },
  {
    id: 'carbonara',
    names: ['карбонара', 'pasta carbonara', 'паста карбонара'],
    components: [C.pasta, C.eggs, C.cheese, C.pork],
  },
  {
    id: 'lasagna',
    names: ['лазанья', 'lasagna'],
    components: [C.pasta, C.beef, C.tomato, C.cheese, C.milk],
  },
  {
    id: 'pizza',
    names: ['пицца', 'pizza'],
    components: [C.wheat, C.tomato, C.cheese, C.oil],
  },
  {
    id: 'burger',
    names: ['бургер', 'гамбургер', 'чизбургер', 'burger'],
    components: [C.bread, C.beef, C.cheese, C.tomato, C.onion, C.mayo],
  },
  {
    id: 'shawarma',
    names: ['шаурма', 'шаверма', 'донер'],
    components: [C.chicken, C.bread, C.cabbage, C.tomato, C.onion, C.mayo],
  },
  {
    id: 'sushi',
    names: ['суши', 'роллы', 'ролл', 'sushi', 'сашими'],
    components: [C.fish, C.rice, C.seafood, C.soy, C.avocado],
  },
  {
    id: 'risotto',
    names: ['ризотто', 'risotto'],
    components: [C.rice, C.cheese, C.butter, C.onion],
  },
  {
    id: 'paella',
    names: ['паэлья', 'paella'],
    components: [C.rice, C.seafood, C.chicken, C.tomato, C.oil],
  },
  {
    id: 'steak',
    names: ['стейк', 'steak'],
    components: [C.beef, C.oil, C.garlic],
  },
  {
    id: 'kotleti',
    names: ['котлеты', 'котлета'],
    components: [C.beef, C.bread, C.eggs, C.onion, C.oil],
  },
  {
    id: 'zharkoye',
    names: ['жаркое'],
    components: [C.beef, C.potato, C.carrot, C.onion, C.oil],
  },
  {
    id: 'kholodets',
    names: ['холодец', 'студень'],
    components: [C.beef, C.pork, C.carrot, C.garlic, C.eggs],
  },
  {
    id: 'hummus',
    names: ['хумус', 'hummus'],
    components: [C.chickpea, C.tahini, C.lemon, C.garlic, C.oil],
  },
  {
    id: 'falafel',
    names: ['фалафель', 'falafel'],
    components: [C.chickpea, C.onion, C.garlic, C.oil, C.wheat],
  },
  {
    id: 'smoothie',
    names: ['смузи', 'smoothie'],
    components: [C.banana, C.apple, C.strawberry, C.milk],
  },
  {
    id: 'compote',
    names: ['компот'],
    components: [C.apple, C.sugar],
  },
  {
    id: 'ice-cream',
    names: ['мороженое', 'ice cream', 'пломбир'],
    components: [C.milk, C.eggs, C.sugar],
  },
  {
    id: 'cake',
    names: ['торт', 'пирожное', 'кекс'],
    components: [C.wheat, C.eggs, C.milk, C.sugar, C.butter],
  },
  {
    id: 'cappuccino',
    names: ['капучино', 'латте', 'cappuccino', 'latte', 'кофе с молоком'],
    components: [C.milk],
  },
  {
    id: 'chocolate',
    names: ['шоколад', 'горячий шоколад'],
    components: [C.chocolate, C.milk, C.sugar],
  },
  {
    id: 'fruit-salad',
    names: ['фруктовый салат'],
    components: [C.apple, C.banana, C.citrus, C.kiwi, C.strawberry],
  },
  {
    id: 'mushroom-soup',
    names: ['грибной суп'],
    components: [C.mushrooms, C.potato, C.onion, C.sourCream],
  },
];

export type DishNameMatch = {
  recipe: DishRecipe;
  score: number;
  matchKind: NameMatchKind;
};

const DEFAULT_DISH_MATCH_LIMIT = 8;

/** Unique ingredient defs used across the static catalog (for ingredients_text matching). */
export const KNOWN_DISH_COMPONENTS: DishComponentDef[] = (() => {
  const seen = new Set<string>();
  const out: DishComponentDef[] = [];
  for (const recipe of DISH_CATALOG) {
    for (const component of recipe.components) {
      if (seen.has(component.id)) continue;
      seen.add(component.id);
      out.push(component);
    }
  }
  return out;
})();

export function findDishMatches(
  foodText: string,
  limit = DEFAULT_DISH_MATCH_LIMIT,
): DishNameMatch[] {
  const query = foodText.trim();
  if (query.length < 2) return [];

  const ranked: DishNameMatch[] = [];
  for (const recipe of DISH_CATALOG) {
    let best: DishNameMatch | null = null;
    for (const name of recipe.names) {
      const scored = scoreNameMatch(query, name);
      if (!scored || scored.score < NAME_MATCH_MIN_SCORE) continue;
      if (!best || scored.score > best.score) {
        best = { recipe, score: scored.score, matchKind: scored.matchKind };
      }
    }
    if (best) ranked.push(best);
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return right.recipe.names[0].length - left.recipe.names[0].length;
  });
  return ranked.slice(0, Math.max(1, limit));
}

/** Best catalog recipe for free-text food, or null when nothing clears the score floor. */
export function findDishRecipe(foodText: string): DishRecipe | null {
  return findDishMatches(foodText, 1)[0]?.recipe ?? null;
}

export function resolveDishComponents(foodText: string): DishComponentDef[] {
  const recipe = findDishRecipe(foodText);
  if (!recipe) return [];
  return mergeDishComponents(recipe.components);
}

/** Deduplicate component lists by id, preserving first-seen order. */
export function mergeDishComponents(...lists: DishComponentDef[][]): DishComponentDef[] {
  const seen = new Set<string>();
  const result: DishComponentDef[] = [];
  for (const list of lists) {
    for (const component of list) {
      if (seen.has(component.id)) continue;
      seen.add(component.id);
      result.push(component);
    }
  }
  return result;
}

/** Map canonical allergen ids (e.g. from OFF allergens_tags) to dish components. */
export function allergenIdsToDishComponents(allergenIds: string[]): DishComponentDef[] {
  const out: DishComponentDef[] = [];
  const seen = new Set<string>();
  for (const raw of allergenIds) {
    const id = resolveAllergenId(raw) ?? raw;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const exact = KNOWN_DISH_COMPONENTS.find((item) => item.id === id);
    if (exact) {
      out.push(exact);
      continue;
    }
    // Prefer a component whose primary allergen is this id and whose id equals allergenId
    // (e.g. milk → milk, not sour-cream which also links allergenId:milk).
    const primary = KNOWN_DISH_COMPONENTS.find((item) => item.allergenId === id && item.id === id);
    if (primary) {
      out.push(primary);
      continue;
    }
    const record = findAllergenById(id);
    out.push({
      id,
      nameRu: record?.name ?? id,
      allergenId: id,
    });
  }
  return out;
}

/**
 * Scan free-text ingredients (e.g. OFF ingredients_text) for known catalog components.
 * Matches by Russian name substrings (normalized).
 */
export function extractComponentsFromIngredientsText(ingredientsText: string): DishComponentDef[] {
  const normalized = normalizeSearchText(ingredientsText);
  if (!normalized) return [];

  // Prefer longer names first so «растительное масло» wins over «масло».
  const ranked = [...KNOWN_DISH_COMPONENTS].sort(
    (a, b) => normalizeSearchText(b.nameRu).length - normalizeSearchText(a.nameRu).length,
  );
  const matched: DishComponentDef[] = [];
  const seen = new Set<string>();
  for (const component of ranked) {
    const needle = normalizeSearchText(component.nameRu);
    if (!needle || needle.length < 3) continue;
    if (!normalized.includes(needle)) continue;
    if (seen.has(component.id)) continue;
    seen.add(component.id);
    matched.push(component);
  }
  return matched;
}

export type ProductDishInput = {
  name?: string;
  ingredients?: string;
  allergenTags?: string[];
  traceTags?: string[];
  barcode?: string;
};

/**
 * Build ingredient checklist from an Open Food Facts / catalog product.
 * Declared allergens + ingredients_text heuristics; traces are included as components too
 * (user can deselect), tagged via allergenId for profile conflict checks.
 */
export function buildComponentsFromProduct(product: ProductDishInput): DishComponentDef[] {
  const fromAllergens = allergenIdsToDishComponents(
    mapExternalAllergenIds([...(product.allergenTags ?? []), ...(product.traceTags ?? [])]),
  );
  const fromIngredients = extractComponentsFromIngredientsText(product.ingredients ?? '');
  return mergeDishComponents(fromAllergens, fromIngredients);
}

/**
 * When enriching a local recipe with OFF data: keep recipe order, append new OFF components.
 */
export function enrichLocalComponentsWithProduct(
  localComponents: DishComponentDef[],
  product: ProductDishInput,
): DishComponentDef[] {
  return mergeDishComponents(localComponents, buildComponentsFromProduct(product));
}

/**
 * Preserve user deselections when the component list grows (e.g. OFF enrichment).
 * New components default to selected; previously known ids keep prior selection state.
 */
export function resolveSelectedIdsForEnrichment(
  previousSelected: string[] | undefined,
  previousAvailableIds: string[] | undefined,
  nextComponents: DishComponentDef[],
): string[] | undefined {
  if (!previousSelected || !previousAvailableIds) return undefined;
  const selected = new Set(previousSelected);
  const previous = new Set(previousAvailableIds);
  return nextComponents
    .map((item) => item.id)
    .filter((id) => (previous.has(id) ? selected.has(id) : true));
}

export function serializeDishComponentDefs(components: DishComponentDef[]): string {
  return JSON.stringify(
    components.map((item) => ({
      id: item.id,
      nameRu: item.nameRu,
      ...(item.allergenId ? { allergenId: item.allergenId } : {}),
    })),
  );
}

export function parseDishComponentDefs(raw: string | undefined | null): DishComponentDef[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DishComponentDef => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      return typeof row.id === 'string' && typeof row.nameRu === 'string';
    });
  } catch {
    return [];
  }
}

export function buildDishBreakdownFromComponents(
  components: DishComponentDef[],
  profileAllergiesJsonOrIds: string | string[],
  meta: { dishId?: string | null; dishName?: string | null } = {},
  selectedIds?: string[],
): DishBreakdownResult {
  const matched = matchComponentsToProfile(components, profileAllergiesJsonOrIds, selectedIds);
  const selected = matched.filter((item) => item.selected);
  return {
    dishId: meta.dishId ?? null,
    dishName: meta.dishName ?? null,
    components: matched,
    allergensSummary: selected.map((item) => item.nameRu).join(', '),
    conflictsSummary: selected
      .filter((item) => item.conflict)
      .map((item) => item.conflictLabel ?? item.nameRu)
      .join('; '),
  };
}

function profileHasAllergen(
  profileAllergenIds: string[],
  allergenId: string | undefined,
): boolean {
  if (!allergenId) return false;
  return profileAllergenIds.includes(allergenId);
}

export function matchComponentsToProfile(
  components: DishComponentDef[],
  profileAllergiesJsonOrIds: string | string[],
  selectedIds?: string[],
): DishComponentMatch[] {
  const profileIds =
    typeof profileAllergiesJsonOrIds === 'string'
      ? parseProfileAllergenIds(profileAllergiesJsonOrIds)
      : profileAllergiesJsonOrIds
          .map((item) => resolveAllergenId(item) ?? item)
          .filter(Boolean);

  const selected = selectedIds ? new Set(selectedIds) : null;
  const cross = getCrossReactionsForSelection(profileIds);
  const crossByRelated = new Map<string, CrossReactionMatch>();
  for (const match of cross) {
    crossByRelated.set(match.allergen.id, match);
  }

  return components.map((component) => {
    const isSelected = selected ? selected.has(component.id) : true;
    const allergenId = component.allergenId;
    let conflict: DishComponentMatch['conflict'] = null;
    let conflictLabel: string | undefined;

    if (allergenId && profileHasAllergen(profileIds, allergenId)) {
      conflict = 'direct';
      conflictLabel = findAllergenById(allergenId)?.name ?? component.nameRu;
    } else if (allergenId && crossByRelated.has(allergenId)) {
      const crossMatch = crossByRelated.get(allergenId)!;
      conflict = 'cross';
      conflictLabel = `${crossMatch.allergen.name} (${crossMatch.note})`;
    }

    return {
      ...component,
      selected: isSelected,
      conflict,
      conflictLabel,
    };
  });
}

export function buildDishBreakdown(
  foodText: string,
  profileAllergiesJsonOrIds: string | string[],
  selectedIds?: string[],
  options?: {
    components?: DishComponentDef[];
    dishId?: string | null;
    dishName?: string | null;
  },
): DishBreakdownResult {
  if (options?.components?.length) {
    return buildDishBreakdownFromComponents(
      options.components,
      profileAllergiesJsonOrIds,
      {
        dishId: options.dishId ?? null,
        dishName: options.dishName ?? null,
      },
      selectedIds,
    );
  }

  const recipe = findDishRecipe(foodText);
  return buildDishBreakdownFromComponents(
    resolveDishComponents(foodText),
    profileAllergiesJsonOrIds,
    {
      dishId: options?.dishId ?? recipe?.id ?? null,
      dishName: options?.dishName ?? recipe?.names[0] ?? null,
    },
    selectedIds,
  );
}

export function parseSelectedComponentIds(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }
  } catch {
    // comma-separated fallback
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeSelectedComponentIds(ids: string[]): string {
  return JSON.stringify(ids);
}

export type ApplyDishBreakdownOptions = {
  components?: DishComponentDef[];
  dishId?: string | null;
  dishName?: string | null;
  /** openfoodfacts | catalog | local | mixed */
  source?: string;
  productBarcode?: string;
  productName?: string;
};

/** Apply dish breakdown into diary nutrition answers. */
export function applyDishBreakdownToAnswers(
  answers: Record<string, string>,
  profileAllergiesJsonOrIds: string | string[],
  options?: ApplyDishBreakdownOptions,
): Record<string, string> {
  const food = answers.food?.trim() ?? '';
  if (!food) return answers;

  const storedDefs = options?.components?.length
    ? options.components
    : parseDishComponentDefs(answers.foodComponentsDef);
  const existingSelected = answers.foodComponents
    ? parseSelectedComponentIds(answers.foodComponents)
    : undefined;

  const recipe = findDishRecipe(food);
  const breakdown = buildDishBreakdown(food, profileAllergiesJsonOrIds, existingSelected, {
    components: storedDefs.length ? storedDefs : undefined,
    dishId: options?.dishId ?? (answers.foodDishId || recipe?.id || null),
    dishName:
      options?.dishName ??
      (answers.foodDishName || recipe?.names[0] || null),
  });

  if (!breakdown.components.length) {
    return {
      ...answers,
      foodDishId: '',
      foodDishName: '',
      foodComponents: '[]',
      foodComponentsDef: '[]',
      foodComponentConflicts: '',
      foodOffSource: '',
      foodOffBarcode: '',
      foodOffName: '',
    };
  }

  const selectedIds = breakdown.components.filter((c) => c.selected).map((c) => c.id);
  const defs = breakdown.components.map(({ id, nameRu, allergenId }) => ({
    id,
    nameRu,
    ...(allergenId ? { allergenId } : {}),
  }));

  return {
    ...answers,
    foodDishId: breakdown.dishId ?? '',
    foodDishName: breakdown.dishName ?? '',
    foodComponents: serializeSelectedComponentIds(selectedIds),
    foodComponentsDef: serializeDishComponentDefs(defs),
    allergens: breakdown.allergensSummary || answers.allergens || '',
    foodComponentConflicts: breakdown.conflictsSummary,
    ...(options?.source !== undefined ? { foodOffSource: options.source } : {}),
    ...(options?.productBarcode !== undefined
      ? { foodOffBarcode: options.productBarcode }
      : {}),
    ...(options?.productName !== undefined ? { foodOffName: options.productName } : {}),
  };
}
