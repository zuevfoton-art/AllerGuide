import {
  buildAllergenKeywordsMap,
  getAllAllergenNames,
  type AllergenRecord,
} from './allergen-database';

export {
  ALLERGENS,
  ALLERGEN_CATEGORY_LABELS,
  getAllAllergens,
  getPopularAllergens,
  getAllergensByCategory,
  findAllergenById,
  findAllergenByName,
  buildAllergenKeywordsMap,
  getAllAllergenNames,
} from './allergen-database';

export type { AllergenCategory, AllergenRecord } from './allergen-database';

export {
  CROSS_REACTIONS,
  CROSS_REACTION_RISK_ORDER,
  compareCrossReactionRisk,
  getCrossReactionsFor,
  getCrossReactionsForSelection,
  pickHigherRiskReaction,
} from './cross-reactions';

export type {
  CrossReaction,
  CrossReactionMatch,
  CrossReactionRisk,
  CrossReactionSyndrome,
} from './cross-reactions';

export const ALLERGEN_OPTIONS = getAllAllergenNames();

export type AllergenOption = AllergenRecord['name'];

export const ALLERGEN_KEYWORDS = buildAllergenKeywordsMap();
