import { ALLERGENS, findAllergenById, getAllergensByCategory } from './allergen-database';
import { resolveAllergenId } from './profile-allergens';
import { getCrossReactionsForSelection } from './cross-reactions';
import type { AllergyConditionId } from './allergy-conditions';
import { decodeDiaryDetails } from './diary-codec';

export interface FoodDrugRegistry {
  v: 1;
  extraAvoidFoods: string[];
  clinicalNotes: string;
}

export interface FoodDrugScanRef {
  productName?: string | null;
  verdict: string;
  level: string;
  matches?: string[];
  createdAt: string;
}

export const FOOD_REACTION_TYPE_CHOICES = [
  'Нет',
  'Ораллергический синдром',
  'ЖКТ',
  'Кожа',
  'Дыхание',
  'Анафилаксия',
] as const;

export const DRUG_SIDE_EFFECT_CHOICES = ['Нет', 'Лёгкая', 'Умеренная', 'Сильная'] as const;

export const FOOD_DRUG_DISCLAIMER =
  'Учёт пищевых и лекарственных реакций носит информационный характер. Назначения и исключения определяет врач.';

const FOOD_ALLERGEN_NAMES = new Set(getAllergensByCategory('food').map((item) => item.name.toLowerCase()));
const MEDICATION_KEYWORDS = getAllergensByCategory('medication').flatMap((item) => [
  item.name.toLowerCase(),
  ...item.keywords.map((k) => k.toLowerCase()),
]);

const DRUG_CLASS_ALIASES: Record<string, string[]> = {
  аспирин: ['ацетилсалицилов', 'аса', 'aspirin', 'салицилат', 'салицил', 'ацк'],
  ибупрофен: ['ибупрофен', 'нурофен', 'адвил', 'диклофенак', 'кетопрофен', 'напроксен', 'нпвп', 'нпвс'],
  пенициллин: ['пенициллин', 'амоксициллин', 'амоксиклав', 'аугментин', 'цефалоспорин'],
  парацетамол: ['парацетамол', 'ацетаминофен', 'панадол', 'эффералган'],
};

export function createDefaultFoodDrugRegistry(): FoodDrugRegistry {
  return { v: 1, extraAvoidFoods: [], clinicalNotes: '' };
}

export function parseFoodDrugRegistry(raw: string | null | undefined): FoodDrugRegistry | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as FoodDrugRegistry;
    if (parsed?.v !== 1) return null;
    return {
      v: 1,
      extraAvoidFoods: Array.isArray(parsed.extraAvoidFoods) ? parsed.extraAvoidFoods : [],
      clinicalNotes: typeof parsed.clinicalNotes === 'string' ? parsed.clinicalNotes : '',
    };
  } catch {
    return null;
  }
}

export function serializeFoodDrugRegistry(registry: FoodDrugRegistry): string {
  return JSON.stringify(registry);
}

export function extractFoodAllergensFromProfile(allergenRefs: string[]): string[] {
  const result: string[] = [];
  for (const ref of allergenRefs) {
    const id = resolveAllergenId(ref) ?? ref;
    const record = findAllergenById(id);
    const name = record?.name ?? ref.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (record?.category === 'food' || FOOD_ALLERGEN_NAMES.has(lower)) {
      result.push(name);
      continue;
    }
    const legacy = ALLERGENS.find(
      (item) =>
        item.category === 'food' &&
        (item.keywords.some((keyword) => lower.includes(keyword)) || lower.includes(item.name.toLowerCase())),
    );
    if (legacy && !result.includes(legacy.name)) {
      result.push(legacy.name);
    }
  }
  return result;
}

export function getConsolidatedFoodAvoidList(
  profileAllergies: string[],
  registry: FoodDrugRegistry | null,
): string[] {
  const merged = new Set<string>([
    ...extractFoodAllergensFromProfile(profileAllergies),
    ...(registry?.extraAvoidFoods ?? []).map((item) => item.trim()).filter(Boolean),
  ]);
  return [...merged];
}

export function isRegistryConfigured(registry: FoodDrugRegistry | null): boolean {
  return Boolean(registry && (registry.extraAvoidFoods.length > 0 || registry.clinicalNotes.trim()));
}

function normalizeDrugToken(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

function drugTokensMatch(medicine: string, intolerance: string): boolean {
  const med = normalizeDrugToken(medicine);
  const target = normalizeDrugToken(intolerance);
  if (!med || !target) return false;
  if (med.includes(target) || target.includes(med)) return true;

  for (const [base, aliases] of Object.entries(DRUG_CLASS_ALIASES)) {
    const inMed = med.includes(base) || aliases.some((alias) => med.includes(alias));
    const inTarget = target.includes(base) || aliases.some((alias) => target.includes(alias));
    if (inMed && inTarget) return true;
  }

  return MEDICATION_KEYWORDS.some(
    (keyword) => keyword.length > 3 && med.includes(keyword) && target.includes(keyword),
  );
}

export function matchDrugIntolerance(medicine: string, intolerances: string[]): string | null {
  const name = medicine.trim();
  if (!name || !intolerances.length) return null;
  for (const intolerance of intolerances) {
    if (drugTokensMatch(name, intolerance)) return intolerance;
  }
  return null;
}

export function buildIntoleranceAlert(medicine: string, intolerances: string[]): string | undefined {
  const match = matchDrugIntolerance(medicine, intolerances);
  if (!match) return undefined;
  return `⚠ В паспорте SOS указана непереносимость: ${match}. Проверьте назначение с врачом.`;
}

export function buildFoodPrefillFromScan(scan: FoodDrugScanRef): Record<string, string> {
  const prefill: Record<string, string> = {
    foodSource: 'Сканер',
  };
  const product = scan.productName?.trim();
  if (product) prefill.food = product;
  if (scan.matches?.length) {
    prefill.allergens = scan.matches.join(', ');
  }
  prefill.scanRef = `${product || 'продукт'}: ${scan.verdict} (${scan.level})`;
  return prefill;
}

function formatCrossReactionsHint(avoidList: string[]): string | undefined {
  const crossMatches = getCrossReactionsForSelection(avoidList);
  if (!crossMatches.length) return undefined;
  return crossMatches
    .slice(0, 5)
    .map((match) => `${match.allergen.name} (${match.risk})`)
    .join(', ');
}

export function enrichFoodPrefillWithCrossReactions(
  prefill: Record<string, string>,
  profileAllergies: string[],
  registry: FoodDrugRegistry | null,
): Record<string, string> {
  if (prefill.crossReactions?.trim()) return prefill;
  const avoidList = getConsolidatedFoodAvoidList(profileAllergies, registry);
  const cross = formatCrossReactionsHint(avoidList);
  if (!cross) return prefill;
  return { ...prefill, crossReactions: cross };
}

/** Единый префилл «Питание»: профиль + опционально скан за 24 ч + перекрёстные реакции. */
export function buildFoodPrefill(
  profileAllergies: string[],
  registry: FoodDrugRegistry | null,
  scan?: FoodDrugScanRef | null,
): Record<string, string> {
  const profilePart = buildFoodPrefillFromProfile(profileAllergies, registry);

  if (!scan) return profilePart;

  const scanPart = buildFoodPrefillFromScan(scan);
  const mergedAllergens = [scanPart.allergens, profilePart.allergens]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('; ');

  const merged: Record<string, string> = {
    ...profilePart,
    ...scanPart,
  };
  if (mergedAllergens) merged.allergens = mergedAllergens;

  return enrichFoodPrefillWithCrossReactions(merged, profileAllergies, registry);
}

export function buildFoodPrefillFromProfile(
  profileAllergies: string[],
  registry: FoodDrugRegistry | null,
): Record<string, string> {
  const avoidList = getConsolidatedFoodAvoidList(profileAllergies, registry);
  const prefill: Record<string, string> = { foodSource: 'Вручную' };
  if (!avoidList.length) return prefill;

  prefill.allergens = avoidList.join(', ');

  const cross = formatCrossReactionsHint(avoidList);
  if (cross) prefill.crossReactions = cross;

  return prefill;
}

export function buildMedicinePrefill(intolerances: string[], medicineDraft = ''): Record<string, string> {
  const prefill: Record<string, string> = {};
  const alert = buildIntoleranceAlert(medicineDraft, intolerances);
  if (alert) prefill.intoleranceAlert = alert;
  return prefill;
}

export interface FoodDrugEpisodeSummary {
  foodEntries: number;
  foodReactions: { none: number; mild: number; moderate: number; severe: number };
  lastFoodReaction: string | null;
  drugEntries: number;
  drugWarnings: number;
  drugSideEffects: { none: number; mild: number; moderate: number; severe: number };
  lastDrugSideEffect: string | null;
}

function mapFoodReaction(value: string | undefined): keyof FoodDrugEpisodeSummary['foodReactions'] {
  const normalized = value?.trim() ?? '';
  if (!normalized || normalized === 'Нет реакции' || normalized === 'Нет') return 'none';
  if (normalized === 'Лёгкая' || normalized === 'Ораллергический синдром') return 'mild';
  if (normalized === 'Умеренная' || normalized === 'ЖКТ' || normalized === 'Кожа' || normalized === 'Дыхание') {
    return 'moderate';
  }
  return 'severe';
}

function mapDrugSideEffect(value: string | undefined): keyof FoodDrugEpisodeSummary['drugSideEffects'] {
  const normalized = value?.trim() ?? '';
  if (!normalized || normalized === 'Нет') return 'none';
  if (normalized === 'Лёгкая') return 'mild';
  if (normalized === 'Умеренная') return 'moderate';
  return 'severe';
}

export function computeFoodDrugSummary(
  entries: { type: string; details: string; createdAt: string }[],
  periodDays = 30,
): FoodDrugEpisodeSummary {
  const cutoff = Date.now() - periodDays * 86_400_000;
  const summary: FoodDrugEpisodeSummary = {
    foodEntries: 0,
    foodReactions: { none: 0, mild: 0, moderate: 0, severe: 0 },
    lastFoodReaction: null,
    drugEntries: 0,
    drugWarnings: 0,
    drugSideEffects: { none: 0, mild: 0, moderate: 0, severe: 0 },
    lastDrugSideEffect: null,
  };

  for (const entry of entries) {
    if (new Date(entry.createdAt).getTime() < cutoff) continue;
    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;

    if (entry.type === 'Питание') {
      summary.foodEntries += 1;
      const reactionKey = mapFoodReaction(
        payload.answers.reactionType?.trim() || payload.answers.reaction?.trim(),
      );
      summary.foodReactions[reactionKey] += 1;
      if (!summary.lastFoodReaction && reactionKey !== 'none') {
        summary.lastFoodReaction =
          payload.answers.reactionType?.trim() || payload.answers.reaction?.trim() || null;
      }
      continue;
    }

    if (entry.type === 'Лекарство') {
      summary.drugEntries += 1;
      if (payload.answers.intoleranceAlert?.trim()) summary.drugWarnings += 1;
      const sideEffectKey = mapDrugSideEffect(payload.answers.sideEffectSeverity?.trim());
      summary.drugSideEffects[sideEffectKey] += 1;
      if (!summary.lastDrugSideEffect && sideEffectKey !== 'none') {
        summary.lastDrugSideEffect = payload.answers.sideEffectSeverity?.trim() || null;
      }
    }
  }

  return summary;
}

export function formatFoodDrugReportSummary(
  summary: FoodDrugEpisodeSummary,
  options: {
    avoidFoods: string[];
    drugIntolerances: string[];
    clinicalNotes?: string;
    periodDays?: number;
  },
): string {
  const lines: string[] = [`Период: ${options.periodDays ?? 30} дней.`];

  if (options.avoidFoods.length) {
    lines.push(`Пищевые аллергены / исключения: ${options.avoidFoods.join(', ')}.`);
  }
  if (options.drugIntolerances.length) {
    lines.push(`Непереносимые ЛС (паспорт SOS): ${options.drugIntolerances.join(', ')}.`);
  }
  if (options.clinicalNotes?.trim()) {
    lines.push(`Заметки: ${options.clinicalNotes.trim()}`);
  }

  if (!summary.foodEntries && !summary.drugEntries) {
    lines.push('Записей о питании и лекарствах за период нет.');
    return lines.join('\n');
  }

  if (summary.foodEntries) {
    lines.push(
      `Питание: ${summary.foodEntries} записей (без реакции — ${summary.foodReactions.none}, лёгкие — ${summary.foodReactions.mild}, умеренные — ${summary.foodReactions.moderate}, сильные/анафилаксия — ${summary.foodReactions.severe}).`,
    );
    if (summary.lastFoodReaction) {
      lines.push(`Последняя зафиксированная пищевая реакция: ${summary.lastFoodReaction}.`);
    }
  }

  if (summary.drugEntries) {
    lines.push(
      `Лекарства: ${summary.drugEntries} записей (предупреждения о непереносимости — ${summary.drugWarnings}; побочные эффекты: нет — ${summary.drugSideEffects.none}, лёгкие — ${summary.drugSideEffects.mild}, умеренные — ${summary.drugSideEffects.moderate}, сильные — ${summary.drugSideEffects.severe}).`,
    );
    if (summary.lastDrugSideEffect) {
      lines.push(`Последняя зафиксированная побочная реакция: ${summary.lastDrugSideEffect}.`);
    }
  }

  return lines.join('\n');
}

export function formatFoodEntrySummary(answers: Record<string, string>): string {
  const parts: string[] = [];
  const food = answers.food?.trim();
  const allergens = answers.allergens?.trim();
  const reaction = answers.reactionType?.trim() || answers.reaction?.trim();
  const source = answers.foodSource?.trim();

  if (food) parts.push(food);
  if (allergens) parts.push(allergens);
  const cross = answers.crossReactions?.trim();
  if (cross) parts.push(`перекрёстные: ${cross}`);
  if (reaction) parts.push(`реакция: ${reaction}`);
  if (source) parts.push(source);

  return parts.length ? parts.join(' · ') : 'Питание';
}

export function formatMedicineEntrySummary(answers: Record<string, string>): string {
  const parts: string[] = [];
  const medicine = answers.medicine?.trim();
  const dosage = answers.dosage?.trim();
  const sideEffect = answers.sideEffectSeverity?.trim();
  const effect = answers.effect?.trim();

  if (medicine) parts.push(medicine);
  if (dosage) parts.push(dosage);
  if (sideEffect && sideEffect !== 'Нет') parts.push(`побочно: ${sideEffect}`);
  else if (effect) parts.push(effect);
  if (answers.intoleranceAlert?.trim()) parts.push('⚠ непереносимость');

  return parts.length ? parts.join(' · ') : 'Лекарство';
}

export function profileEnablesFoodFocus(
  conditionIds: AllergyConditionId[],
  profileAllergies: string[] = [],
): boolean {
  if (conditionIds.includes('food')) return true;
  return extractFoodAllergensFromProfile(profileAllergies).length > 0;
}

export function profileEnablesDrugFocus(
  conditionIds: AllergyConditionId[],
  drugIntolerances: string[] = [],
): boolean {
  if (conditionIds.includes('drug')) return true;
  return drugIntolerances.length > 0;
}
