import { findAllergenById } from './allergen-database';
import { getCrossReactionsForSelection, type CrossReactionMatch } from './cross-reactions';
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

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

export function findDishRecipe(foodText: string): DishRecipe | null {
  const normalized = normalizeText(foodText);
  if (!normalized) return null;

  let best: { recipe: DishRecipe; score: number } | null = null;
  for (const recipe of DISH_CATALOG) {
    for (const name of recipe.names) {
      const needle = normalizeText(name);
      if (!needle) continue;
      if (normalized === needle || normalized.includes(needle)) {
        const score = needle.length;
        if (!best || score > best.score) best = { recipe, score };
      }
    }
  }
  return best?.recipe ?? null;
}

export function resolveDishComponents(foodText: string): DishComponentDef[] {
  const recipe = findDishRecipe(foodText);
  if (!recipe) return [];
  // Deduplicate by id while preserving order
  const seen = new Set<string>();
  const result: DishComponentDef[] = [];
  for (const component of recipe.components) {
    if (seen.has(component.id)) continue;
    seen.add(component.id);
    result.push(component);
  }
  return result;
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
): DishBreakdownResult {
  const recipe = findDishRecipe(foodText);
  const components = matchComponentsToProfile(
    resolveDishComponents(foodText),
    profileAllergiesJsonOrIds,
    selectedIds,
  );

  const selected = components.filter((item) => item.selected);
  const allergensSummary = selected
    .map((item) => item.nameRu)
    .join(', ');
  const conflictsSummary = selected
    .filter((item) => item.conflict)
    .map((item) => item.conflictLabel ?? item.nameRu)
    .join('; ');

  return {
    dishId: recipe?.id ?? null,
    dishName: recipe?.names[0] ?? null,
    components,
    allergensSummary,
    conflictsSummary,
  };
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

/** Apply dish breakdown into diary nutrition answers. */
export function applyDishBreakdownToAnswers(
  answers: Record<string, string>,
  profileAllergiesJsonOrIds: string | string[],
): Record<string, string> {
  const food = answers.food?.trim() ?? '';
  if (!food) return answers;

  const existingSelected = answers.foodComponents
    ? parseSelectedComponentIds(answers.foodComponents)
    : undefined;
  const breakdown = buildDishBreakdown(food, profileAllergiesJsonOrIds, existingSelected);

  if (!breakdown.components.length) {
    return {
      ...answers,
      foodDishId: '',
      foodComponents: '[]',
      foodComponentConflicts: '',
    };
  }

  const selectedIds = breakdown.components.filter((c) => c.selected).map((c) => c.id);

  return {
    ...answers,
    foodDishId: breakdown.dishId ?? '',
    foodComponents: serializeSelectedComponentIds(selectedIds),
    allergens: breakdown.allergensSummary || answers.allergens || '',
    foodComponentConflicts: breakdown.conflictsSummary,
  };
}
