import {
  buildComponentsFromProduct,
  buildDishComponentsFromText,
  mapExternalAllergenIds,
  type DishComponentDef,
  type FoodDrugScanRef,
} from '@allerguide/core';
import { buildOcrScanProductName, type ScanMode } from '@allerguide/ai';
import { addDiaryEntries, type DiaryMutationResult } from '@/src/services/diary-service';
import { extractDishSearchQuery } from '@/src/services/scanner-dish-query';
import { isManualBarcodeInput } from '@/src/constants/scanner-mode';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { trackEvent } from '@/src/services/analytics-service';
import type { ScanResultExtended } from '@/src/services/scan-analysis';

/** Food, label and dish scans all belong to the «Питание» diary section. */
export const SCAN_DIARY_SECTION_TYPE = 'Питание';

const MAX_FOOD_NAME_CHARS = 80;
const COMPOSITION_MARKER = /(состав|ингредиенты|ingredients|composition)\s*[:：]/i;
const SCAN_MODES: ScanMode[] = ['product', 'menu', 'medicine', 'cosmetics'];
/** OCR scans without a recognized dish carry a placeholder name — not a food name. */
const OCR_PLACEHOLDER_NAMES = new Set(SCAN_MODES.map(buildOcrScanProductName));

export type ScanDiaryDish = {
  food: string;
  components: DishComponentDef[];
  dishId?: string;
  dishName?: string;
  source?: string;
  productBarcode?: string;
  productName?: string;
};

export type ScanDiaryDraft = {
  dish: ScanDiaryDish;
  scanRef: FoodDrugScanRef;
  /** Ask for the dish name first when the scan gave no reliable product name. */
  initialStepId: 'food' | 'reaction';
};

/** Matched allergens, by id when the scan is structured and by label for history entries. */
function declaredAllergenIds(result: ScanResultExtended): string[] {
  const structured = result.structuredMatches ?? [];
  if (structured.length > 0) {
    return mapExternalAllergenIds(
      structured
        .filter((match) => match.kind === 'direct' || match.kind === 'cross')
        .map((match) => match.allergenId),
    );
  }
  return mapExternalAllergenIds([...result.matches, ...result.crossMatches]);
}

function traceAllergenIds(result: ScanResultExtended): string[] {
  const structured = result.structuredMatches ?? [];
  if (structured.length > 0) {
    return mapExternalAllergenIds(
      structured.filter((match) => match.kind === 'trace').map((match) => match.allergenId),
    );
  }
  return mapExternalAllergenIds(result.traceMatches ?? []);
}

/** Composition text the verdict was built from, ignoring bare barcode input. */
function resolveCompositionText(result: ScanResultExtended, scanText: string): string {
  const fromProduct = result.productIngredients?.trim();
  if (fromProduct) return fromProduct;

  const fromVision = result.dishVision?.ingredients?.join(', ').trim();
  if (fromVision) return fromVision;

  const fromOcr = result.ocr?.ingredientsBlock?.trim() || result.ocr?.text?.trim();
  if (fromOcr) return fromOcr;

  const manual = scanText.trim();
  return isManualBarcodeInput(manual) ? '' : manual;
}

/** «Шоколад молочный. Состав: сахар, …» → «Шоколад молочный». */
function dishTitleBeforeComposition(text: string): string {
  const firstLine = text.split('\n')[0] ?? '';
  const markerIndex = firstLine.search(COMPOSITION_MARKER);
  if (markerIndex <= 0) return '';
  return firstLine
    .slice(0, markerIndex)
    .replace(/[\s.,;:·—-]+$/, '')
    .trim();
}

function resolveFoodName(result: ScanResultExtended, compositionText: string): string {
  const fromVision = result.dishVision?.dishName?.trim();
  if (fromVision) return fromVision.slice(0, MAX_FOOD_NAME_CHARS);

  const fromProduct = result.productName?.trim();
  if (fromProduct && !OCR_PLACEHOLDER_NAMES.has(fromProduct)) {
    return fromProduct.slice(0, MAX_FOOD_NAME_CHARS);
  }

  const title = dishTitleBeforeComposition(compositionText);
  if (title) return title.slice(0, MAX_FOOD_NAME_CHARS);

  return extractDishSearchQuery(compositionText).slice(0, MAX_FOOD_NAME_CHARS);
}

/**
 * Map a scan verdict onto a «Питание» diary draft: dish name, ingredient
 * checklist and the scan reference line. Offline and side-effect free — the
 * user confirms the reaction in the wizard before anything is written.
 */
export function buildScanDiaryDraft(input: {
  result: ScanResultExtended;
  scanText: string;
  barcode?: string;
}): ScanDiaryDraft {
  const { result } = input;
  const compositionText = resolveCompositionText(result, input.scanText);
  const food = resolveFoodName(result, compositionText);
  const allergenTags = declaredAllergenIds(result);
  const traceTags = traceAllergenIds(result);
  const barcode =
    input.barcode?.trim() ||
    (isManualBarcodeInput(input.scanText) ? input.scanText.trim() : undefined);

  const fromProduct = buildComponentsFromProduct({
    name: food,
    ingredients: compositionText,
    allergenTags,
    traceTags,
    barcode,
  });
  const components = fromProduct.length > 0 ? fromProduct : buildDishComponentsFromText(compositionText);

  return {
    dish: {
      food,
      components,
      dishId: barcode ? `barcode:${barcode}` : undefined,
      dishName: food || undefined,
      source: result.source,
      productBarcode: barcode,
      productName: result.productName ?? undefined,
    },
    scanRef: {
      productName: food || result.productName,
      verdict: result.verdict,
      level: result.level,
      matches: result.matches,
      createdAt: new Date().toISOString(),
    },
    initialStepId: food ? 'reaction' : 'food',
  };
}

/**
 * Persist the diary entry produced from a scan result and record the funnel step
 * (scan → diary) next to the generic `diary_entry_saved`.
 */
export async function saveScanDiaryEntry(input: {
  profileId: number;
  entries: { type: string; details: string; photoUris?: string[] }[];
  level: string;
  source?: string;
}): Promise<DiaryMutationResult> {
  const results = await addDiaryEntries(input.profileId, input.entries);
  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) return failed;

  trackEvent('scan_saved_to_diary', {
    risk_level: input.level,
    scan_source: input.source ?? 'manual',
  });
  // Diary reminders skip days that already have an entry — same as saving from the diary tab.
  void reconcileAllReminders();
  return results[0] ?? { ok: false, code: 'invalid_input' };
}
