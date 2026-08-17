import { extractComponentsFromIngredientsText, type DishComponentDef } from '@allerguide/core';
import {
  enrichDishFromOpenFoods,
  type DishEnrichmentResult,
} from '@/src/services/dish-off-enrichment-service';
import { extractDishSearchQuery } from '@/src/services/scanner-dish-query';
import { lookupDishIngredientsForScan } from '@/src/services/scanner-dish-lookup-service';
import { scanFromOcr } from '@/src/services/scanner-ocr-service';

const MAX_FALLBACK_INGREDIENTS = 20;

function fallbackComponentsFromText(text: string): DishComponentDef[] {
  const known = extractComponentsFromIngredientsText(text);
  if (known.length) return known;

  const seen = new Set<string>();
  const items: DishComponentDef[] = [];
  for (const part of text.split(/[,;]/)) {
    const nameRu = part.trim().replace(/\s+/g, ' ');
    if (nameRu.length < 2) continue;
    const id = `ing:${nameRu.toLowerCase().replace(/ё/g, 'е')}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ id, nameRu });
    if (items.length >= MAX_FALLBACK_INGREDIENTS) break;
  }
  return items;
}

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
    const components = fallbackComponentsFromText(lookup.ingredients);
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

  const fromOcr = fallbackComponentsFromText(scan.ocr?.text ?? food);
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
