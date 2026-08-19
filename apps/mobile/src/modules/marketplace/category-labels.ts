import type { MarketplaceCategory } from '@allerguide/core';

export type TranslationMarketCategoryKey =
  | 'categoryAll'
  | 'categoryAir'
  | 'categorySkin'
  | 'categoryHome'
  | 'categoryFood'
  | 'categorySos'
  | 'categoryPharmacy';

export const CATEGORY_LABEL_KEYS: Record<MarketplaceCategory | 'all', TranslationMarketCategoryKey> = {
  all: 'categoryAll',
  air: 'categoryAir',
  skin: 'categorySkin',
  home: 'categoryHome',
  food: 'categoryFood',
  sos: 'categorySos',
  pharmacy: 'categoryPharmacy',
};
