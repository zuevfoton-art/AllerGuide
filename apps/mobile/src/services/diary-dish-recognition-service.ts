import {
  buildComponentsFromProduct,
  buildDishComponentsFromText,
  isValidBarcode,
  normalizeBarcode,
} from '@allerguide/core';
import {
  enrichDishFromOpenFoods,
  type DishEnrichmentResult,
  type DishEnrichmentSource,
} from '@/src/services/dish-off-enrichment-service';
import {
  resolveProductByBarcode,
  type BarcodeLookupSource,
} from '@/src/services/barcode-lookup-service';
import { extractDishSearchQuery } from '@/src/services/scanner-dish-query';
import { lookupDishIngredientsForScan } from '@/src/services/scanner-dish-lookup-service';
import { scanFromOcr } from '@/src/services/scanner-ocr-service';

/**
 * Diary «Ввести вручную» uses the same dish lookup as the scanner:
 * local catalog / OFF / Yandex search → checklist components.
 */
export async function recognizeDiaryDish(foodText: string): Promise<DishEnrichmentResult | null> {
  const food = foodText.trim();
  if (food.length < 2) return null;

  const lookup = await lookupDishIngredientsForScan(food);
  if (lookup?.enrichment?.components.length) {
    return lookup.enrichment;
  }

  if (lookup?.ingredients.trim()) {
    const components = buildDishComponentsFromText(lookup.ingredients);
    if (components.length) {
      return {
        components,
        dishId: lookup.enrichment?.dishId ?? `search:${lookup.query}`,
        dishName: lookup.enrichment?.dishName || lookup.productName || lookup.query,
        source: lookup.enrichment?.source ?? 'local',
        productBarcode: lookup.enrichment?.productBarcode,
        productName: lookup.enrichment?.productName || lookup.productName,
        ingredients: lookup.ingredients,
        allergenTags: lookup.declaredAllergenIds,
        traceTags: lookup.traceAllergenIds,
        previousAvailableIds: lookup.enrichment?.previousAvailableIds,
      };
    }
  }

  return enrichDishFromOpenFoods(food);
}

export type RecognizedDiaryDish = {
  food: string;
  enrichment: DishEnrichmentResult;
};

function enrichmentSourceFromLookup(source: BarcodeLookupSource): DishEnrichmentSource {
  if (
    source === 'openfoodfacts' ||
    source === 'openbeautyfacts' ||
    source === 'openproductsfacts'
  ) {
    return 'openfoodfacts';
  }
  return 'catalog';
}

/**
 * Packaged product via the same catalog → cache → OFF chain as Scanner barcode.
 */
export async function recognizeDiaryDishFromBarcode(
  rawBarcode: string,
): Promise<RecognizedDiaryDish | null> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!isValidBarcode(barcode)) return null;

  const product = await resolveProductByBarcode(barcode);
  if (!product) return null;

  const fromProduct = buildComponentsFromProduct({
    name: product.name,
    ingredients: product.ingredients,
    allergenTags: product.declaredAllergenIds,
    traceTags: product.traceAllergenIds,
    barcode: product.barcode,
  });
  const components =
    fromProduct.length > 0
      ? fromProduct
      : buildDishComponentsFromText(product.ingredients || product.name);

  return {
    food: product.name,
    enrichment: {
      components: components.length ? components : [{ id: 'dish', nameRu: product.name }],
      dishId: `barcode:${product.barcode}`,
      dishName: product.name,
      source: enrichmentSourceFromLookup(product.source),
      productBarcode: product.barcode,
      productName: product.name,
      ingredients: product.ingredients,
      allergenTags: product.declaredAllergenIds,
      traceTags: product.traceAllergenIds,
    },
  };
}

/**
 * Photo path: same VL/OCR pipeline as the scanner, then the manual dish lookup.
 */
export async function recognizeDiaryDishFromPhoto(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<RecognizedDiaryDish | null> {
  const scan = await scanFromOcr({
    mode: 'product',
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
  });
  const food = (scan.productName?.trim() || extractDishSearchQuery(scan.ocr?.text ?? '')).trim();
  if (!food) return null;

  const enrichment = await recognizeDiaryDish(food);
  if (enrichment) {
    return { food: enrichment.dishName || food, enrichment };
  }

  const fromOcr = buildDishComponentsFromText(scan.ocr?.text ?? food);
  if (!fromOcr.length) {
    return {
      food,
      enrichment: {
        components: [{ id: 'dish', nameRu: food }],
        dishId: '',
        dishName: food,
        source: 'local',
      },
    };
  }

  return {
    food,
    enrichment: {
      components: fromOcr,
      dishId: '',
      dishName: food,
      source: 'local',
      ingredients: scan.ocr?.text,
    },
  };
}
