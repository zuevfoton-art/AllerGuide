import { expandAllergenTagsForScan } from '@allerguide/core';
import type { ScanResult } from '@allerguide/ai';
import {
  enrichDishFromOpenFoods,
  type DishEnrichmentResult,
} from '@/src/services/dish-off-enrichment-service';
import { searchIngredientsViaApi } from '@/src/services/search-ingredients-api-service';
import { extractDishSearchQuery } from '@/src/services/scanner-dish-query';

export { extractDishSearchQuery } from '@/src/services/scanner-dish-query';

export type DishScanLookup = {
  query: string;
  productName: string;
  ingredients: string;
  declaredAllergenIds: string[];
  traceAllergenIds: string[];
  source: NonNullable<ScanResult['source']>;
  enrichment?: DishEnrichmentResult;
};

function buildIngredientsText(
  base: string,
  declaredTags: string[],
  traceTags: string[],
): string {
  const declaredExpanded = expandAllergenTagsForScan(declaredTags);
  const traceExpanded = expandAllergenTagsForScan(traceTags);
  const tracePhrase =
    traceExpanded.length > 0 ? `может содержать ${traceExpanded.join(', ')}` : '';
  return [base, ...declaredExpanded, tracePhrase].filter(Boolean).join(', ');
}

function mapEnrichmentSource(
  source: DishEnrichmentResult['source'],
): NonNullable<ScanResult['source']> {
  if (source === 'catalog') return 'catalog_api';
  if (source === 'openfoodfacts' || source === 'mixed') return 'openfoodfacts';
  return 'ocr';
}

/**
 * OCR/dish name → local dish catalog and/or Open Food Facts ingredients.
 * Option C (flag): Yandex Search API when catalog/OFF miss.
 */
export async function lookupDishIngredientsForScan(
  ocrText: string,
): Promise<DishScanLookup | null> {
  const query = extractDishSearchQuery(ocrText);
  if (query.length < 2) return null;

  const enrichment = await enrichDishFromOpenFoods(query);
  if (enrichment) {
    const declared =
      enrichment.allergenTags ??
      enrichment.components
        .map((item) => item.allergenId)
        .filter((id): id is string => Boolean(id));
    const traces = enrichment.traceTags ?? [];
    const base =
      enrichment.ingredients?.trim() ||
      enrichment.components.map((item) => item.nameRu).join(', ');
    if (base.trim()) {
      return {
        query,
        productName: enrichment.productName || enrichment.dishName,
        ingredients: buildIngredientsText(base, declared, traces),
        declaredAllergenIds: declared,
        traceAllergenIds: traces,
        source: mapEnrichmentSource(enrichment.source),
        enrichment,
      };
    }
  }

  const yandex = await searchIngredientsViaApi(query);
  if (!yandex) return null;

  return {
    query: yandex.query,
    productName: yandex.productName,
    ingredients: yandex.ingredients,
    declaredAllergenIds: [],
    traceAllergenIds: [],
    source: 'ocr',
  };
}
