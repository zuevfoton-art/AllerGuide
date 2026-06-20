import {
  buildAllergenKeywordsMap,
  getAllAllergenNames,
  type AllergenRecord,
} from './allergen-database';

export {
  ALLERGENS,
  ALLERGEN_CATEGORY_LABELS,
  CROSS_REACTIONS,
  getAllAllergens,
  getPopularAllergens,
  getAllergensByCategory,
  findAllergenById,
  findAllergenByName,
  getCrossReactionsFor,
  getCrossReactionsForSelection,
  buildAllergenKeywordsMap,
  getAllAllergenNames,
} from './allergen-database';

export type {
  AllergenCategory,
  AllergenRecord,
  CrossReaction,
  CrossReactionMatch,
} from './allergen-database';

export const ALLERGEN_OPTIONS = getAllAllergenNames();

export type AllergenOption = AllergenRecord['name'];

export const ALLERGEN_KEYWORDS = buildAllergenKeywordsMap();
