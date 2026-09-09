import { ALLERGENS, findAllergenById, getAllergensByCategory } from './allergen-database';
import { resolveAllergenId } from './profile-allergens';
import type { AllergyConditionId } from './allergy-conditions';
import { decodeDiaryDetails } from './diary-format';

export interface InsectActionPlan {
  v: 1;
  knownInsects: string[];
  adrenalineLocation: string;
  emergencySteps: string;
  clinicalNotes: string;
}

export const INSECT_TYPE_CHOICES = ['Пчёлы', 'Осы', 'Шершни', 'Комары', 'Другое'] as const;
export const STING_SEVERITY_CHOICES = ['Лёгкая', 'Умеренная', 'Тяжёлая', 'Анафилаксия'] as const;
export const STING_LOCAL_SYMPTOM_CHOICES = [
  'Покраснение',
  'Отёк',
  'Зуд',
  'Боль',
  'Крапивница',
  'Нет',
] as const;
export const STING_SYSTEMIC_SYMPTOM_CHOICES = [
  'Нет',
  'Зуд кожи',
  'Одышка',
  'Головокружение',
  'Тошнота',
  'Падение давления',
] as const;

const INSECT_ALLERGEN_NAMES = new Set(getAllergensByCategory('insect').map((item) => item.name.toLowerCase()));
const INSECT_KEYWORDS = getAllergensByCategory('insect').flatMap((item) => [
  item.name.toLowerCase(),
  ...item.keywords.map((k) => k.toLowerCase()),
]);

export function createDefaultInsectActionPlan(): InsectActionPlan {
  return {
    v: 1,
    knownInsects: [],
    adrenalineLocation: '',
    emergencySteps: '',
    clinicalNotes: '',
  };
}

export function parseInsectActionPlan(raw: string | null | undefined): InsectActionPlan | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as InsectActionPlan;
    if (parsed?.v !== 1) return null;
    return {
      v: 1,
      knownInsects: Array.isArray(parsed.knownInsects) ? parsed.knownInsects : [],
      adrenalineLocation: typeof parsed.adrenalineLocation === 'string' ? parsed.adrenalineLocation : '',
      emergencySteps: typeof parsed.emergencySteps === 'string' ? parsed.emergencySteps : '',
      clinicalNotes: typeof parsed.clinicalNotes === 'string' ? parsed.clinicalNotes : '',
    };
  } catch {
    return null;
  }
}

export function serializeInsectActionPlan(plan: InsectActionPlan): string {
  return JSON.stringify(plan);
}

export function isInsectPlanConfigured(plan: InsectActionPlan | null): boolean {
  return Boolean(
    plan &&
      (plan.knownInsects.length > 0 ||
        plan.adrenalineLocation.trim() ||
        plan.emergencySteps.trim() ||
        plan.clinicalNotes.trim()),
  );
}

export function extractInsectAllergensFromProfile(allergenRefs: string[]): string[] {
  const result: string[] = [];
  for (const ref of allergenRefs) {
    const id = resolveAllergenId(ref) ?? ref;
    const record = findAllergenById(id);
    const name = record?.name ?? ref.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (record?.category === 'insect' || INSECT_ALLERGEN_NAMES.has(lower)) {
      if (!result.includes(name)) result.push(name);
      continue;
    }
    const legacy = ALLERGENS.find(
      (item) =>
        item.category === 'insect' &&
        (item.keywords.some((keyword) => lower.includes(keyword)) || lower.includes(item.name.toLowerCase())),
    );
    if (legacy && !result.includes(legacy.name)) {
      result.push(legacy.name);
    }
  }
  return result;
}

export function getConsolidatedInsectList(
  profileAllergies: string[],
  plan: InsectActionPlan | null,
): string[] {
  const merged = new Set<string>([
    ...extractInsectAllergensFromProfile(profileAllergies),
    ...(plan?.knownInsects ?? []).map((item) => item.trim()).filter(Boolean),
  ]);
  return [...merged];
}

export function profileEnablesInsectFocus(
  conditionIds: AllergyConditionId[],
  profileAllergies: string[] = [],
): boolean {
  if (conditionIds.includes('insect')) return true;
  return extractInsectAllergensFromProfile(profileAllergies).length > 0;
}

export function buildInsectStingPrefill(
  profileAllergies: string[],
  plan: InsectActionPlan | null,
): Record<string, string> {
  const insects = getConsolidatedInsectList(profileAllergies, plan);
  const prefill: Record<string, string> = {};
  if (insects.length) {
    prefill.insectType = insects[0];
    prefill.knownInsects = insects.join(', ');
  }
  if (plan?.adrenalineLocation.trim()) {
    prefill.adrenalineLocation = plan.adrenalineLocation.trim();
  }
  if (plan?.emergencySteps.trim()) {
    prefill.emergencyPlan = plan.emergencySteps.trim();
  }
  return prefill;
}

export interface InsectStingSummary {
  totalStings: number;
  severe: number;
  adrenalineUsed: number;
  lastSeverity: string | null;
  lastStingAt: string | null;
}

function mapStingSeverity(value: string | undefined): 'mild' | 'moderate' | 'severe' {
  const normalized = value?.trim() ?? '';
  if (normalized === 'Анафилаксия' || normalized === 'Тяжёлая') return 'severe';
  if (normalized === 'Умеренная') return 'moderate';
  return 'mild';
}

export function computeInsectStingSummary(
  entries: { type: string; details: string; createdAt: string }[],
  periodDays = 30,
): InsectStingSummary {
  const cutoff = Date.now() - periodDays * 86_400_000;
  const summary: InsectStingSummary = {
    totalStings: 0,
    severe: 0,
    adrenalineUsed: 0,
    lastSeverity: null,
    lastStingAt: null,
  };

  for (const entry of entries) {
    if (entry.type !== 'Укус насекомого') continue;
    if (new Date(entry.createdAt).getTime() < cutoff) continue;

    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;

    summary.totalStings += 1;
    const severity = mapStingSeverity(payload.answers.stingSeverity?.trim());
    if (severity === 'severe') summary.severe += 1;
    if (payload.answers.adrenalineUsed?.trim() === 'Да') summary.adrenalineUsed += 1;

    if (!summary.lastStingAt) {
      summary.lastStingAt = entry.createdAt;
      summary.lastSeverity = payload.answers.stingSeverity?.trim() || null;
    }
  }

  return summary;
}

export function formatInsectStingEntrySummary(answers: Record<string, string>): string {
  const parts: string[] = [];
  const insect = answers.insectType?.trim();
  const location = answers.stingLocation?.trim();
  const severity = answers.stingSeverity?.trim();
  const local = answers.localSymptoms?.trim();
  const systemic = answers.systemicSymptoms?.trim();
  const adrenaline = answers.adrenalineUsed?.trim();

  if (insect) parts.push(insect);
  if (location) parts.push(location);
  if (severity) parts.push(`тяжесть: ${severity}`);
  if (local && local !== 'Нет') parts.push(`местные: ${local}`);
  if (systemic && systemic !== 'Нет') parts.push(`системные: ${systemic}`);
  if (adrenaline === 'Да') parts.push('адреналин');

  return parts.length ? parts.join(' · ') : 'Укус насекомого';
}

export function formatInsectReportSummary(
  summary: InsectStingSummary,
  options: {
    knownInsects: string[];
    adrenalineLocation?: string;
    emergencySteps?: string;
    clinicalNotes?: string;
    periodDays?: number;
  },
): string {
  const lines: string[] = [`Период: ${options.periodDays ?? 30} дней.`];

  if (options.knownInsects.length) {
    lines.push(`Рисковые насекомые: ${options.knownInsects.join(', ')}.`);
  }
  if (options.adrenalineLocation?.trim()) {
    lines.push(`Адреналин: ${options.adrenalineLocation.trim()}`);
  }
  if (options.emergencySteps?.trim()) {
    lines.push(`План действий: ${options.emergencySteps.trim()}`);
  }
  if (options.clinicalNotes?.trim()) {
    lines.push(`Заметки: ${options.clinicalNotes.trim()}`);
  }

  if (!summary.totalStings) {
    lines.push('Записей об укусах за период нет.');
    return lines.join('\n');
  }

  lines.push(
    `Укусов: ${summary.totalStings} (тяжёлые/анафилаксия — ${summary.severe}, адреналин — ${summary.adrenalineUsed}).`,
  );
  if (summary.lastSeverity) {
    lines.push(`Последняя зафиксированная тяжесть: ${summary.lastSeverity}.`);
  }

  return lines.join('\n');
}

export function matchesInsectKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return INSECT_KEYWORDS.some((keyword) => keyword.length > 2 && lower.includes(keyword));
}
