/**
 * Profile symptom baseline (onboarding P3) — “what usually bothers you”,
 * not a diary entry. Stored in app settings as JSON.
 */

import type { AllergyConditionId } from './allergy-conditions';
import { SYMPTOM_CATALOG, type SymptomConcept } from './symptom-coding';

export const SYMPTOM_ZONE_IDS = [
  'nose',
  'eyes',
  'skin',
  'lungs',
  'gi',
  'systemic',
] as const;

export type SymptomZoneId = (typeof SYMPTOM_ZONE_IDS)[number];

export const SYMPTOM_USUAL_SEVERITIES = ['mild', 'moderate', 'severe'] as const;
export type SymptomUsualSeverity = (typeof SYMPTOM_USUAL_SEVERITIES)[number];

export const PROFILE_SYMPTOM_BASELINE_MAX_IDS = 8;

export interface ProfileSymptomBaseline {
  zoneIds: SymptomZoneId[];
  usualSeverity: SymptomUsualSeverity | null;
  typicalSymptomIds: string[];
  updatedAt: string;
}

export const SYMPTOM_ZONE_LABELS_RU: Record<SymptomZoneId, string> = {
  nose: 'Нос',
  eyes: 'Глаза',
  skin: 'Кожа',
  lungs: 'Дыхание',
  gi: 'ЖКТ',
  systemic: 'Общие / системные',
};

/** Catalog symptom ids grouped by body zone. */
export const SYMPTOM_IDS_BY_ZONE: Record<SymptomZoneId, readonly string[]> = {
  nose: ['nasal-congestion', 'rhinorrhea', 'sneezing'],
  eyes: ['ocular-itching', 'conjunctival-redness'],
  skin: ['pruritus', 'urticaria', 'angioedema'],
  lungs: ['cough', 'wheeze', 'chest-tightness', 'laryngeal-edema'],
  gi: ['nausea', 'vomiting', 'diarrhea', 'gi-symptoms'],
  systemic: ['anaphylaxis', 'hypotension-syncope'],
};

/** Soft suggestions by allergy condition type (unioned with zone filter). */
export const SYMPTOM_IDS_BY_CONDITION: Partial<Record<AllergyConditionId, readonly string[]>> = {
  food: ['nausea', 'vomiting', 'diarrhea', 'gi-symptoms', 'urticaria', 'pruritus', 'anaphylaxis'],
  pollinosis: ['nasal-congestion', 'rhinorrhea', 'sneezing', 'ocular-itching', 'conjunctival-redness'],
  rhinitis: ['nasal-congestion', 'rhinorrhea', 'sneezing', 'ocular-itching'],
  asthma: ['cough', 'wheeze', 'chest-tightness'],
  dermatitis: ['pruritus', 'urticaria'],
  urticaria: ['urticaria', 'angioedema', 'pruritus'],
  insect: ['urticaria', 'angioedema', 'anaphylaxis', 'hypotension-syncope'],
  drug: ['urticaria', 'angioedema', 'anaphylaxis', 'pruritus'],
  household: ['nasal-congestion', 'sneezing', 'ocular-itching', 'cough', 'wheeze'],
  animal: ['nasal-congestion', 'sneezing', 'ocular-itching', 'cough', 'wheeze'],
  other: [],
};

export function isSymptomZoneId(value: string): value is SymptomZoneId {
  return (SYMPTOM_ZONE_IDS as readonly string[]).includes(value);
}

export function isSymptomUsualSeverity(value: string): value is SymptomUsualSeverity {
  return (SYMPTOM_USUAL_SEVERITIES as readonly string[]).includes(value);
}

export function createEmptySymptomBaseline(now = new Date()): ProfileSymptomBaseline {
  return {
    zoneIds: [],
    usualSeverity: null,
    typicalSymptomIds: [],
    updatedAt: now.toISOString(),
  };
}

export function isSymptomBaselineEmpty(
  baseline: Pick<ProfileSymptomBaseline, 'zoneIds' | 'usualSeverity' | 'typicalSymptomIds'> | null | undefined,
): boolean {
  if (!baseline) return true;
  return (
    baseline.zoneIds.length === 0 &&
    baseline.usualSeverity == null &&
    baseline.typicalSymptomIds.length === 0
  );
}

export function normalizeSymptomBaseline(
  input: Partial<ProfileSymptomBaseline> | null | undefined,
  now = new Date(),
): ProfileSymptomBaseline | null {
  if (!input) return null;

  const zoneIds = [...new Set((input.zoneIds ?? []).filter(isSymptomZoneId))];
  const usualSeverity =
    input.usualSeverity && isSymptomUsualSeverity(input.usualSeverity)
      ? input.usualSeverity
      : null;
  const typicalSymptomIds = [
    ...new Set(
      (input.typicalSymptomIds ?? []).filter((id) => SYMPTOM_CATALOG.some((item) => item.id === id)),
    ),
  ].slice(0, PROFILE_SYMPTOM_BASELINE_MAX_IDS);

  const baseline: ProfileSymptomBaseline = {
    zoneIds,
    usualSeverity,
    typicalSymptomIds,
    updatedAt:
      typeof input.updatedAt === 'string' && input.updatedAt.trim()
        ? input.updatedAt
        : now.toISOString(),
  };

  return isSymptomBaselineEmpty(baseline) ? null : baseline;
}

export function parseSymptomBaselineJson(raw: string | null | undefined): ProfileSymptomBaseline | null {
  if (!raw?.trim()) return null;
  try {
    return normalizeSymptomBaseline(JSON.parse(raw) as Partial<ProfileSymptomBaseline>);
  } catch {
    return null;
  }
}

export function serializeSymptomBaseline(baseline: ProfileSymptomBaseline | null): string | null {
  const normalized = normalizeSymptomBaseline(baseline);
  return normalized ? JSON.stringify(normalized) : null;
}

/**
 * Suggest catalog symptoms for the baseline picker.
 * If zones are selected — filter by zones; else by conditions; else popular defaults.
 */
export function suggestSymptomsForProfile(
  conditions: AllergyConditionId[],
  zoneIds: SymptomZoneId[],
): SymptomConcept[] {
  const allowed = new Set<string>();

  if (zoneIds.length > 0) {
    for (const zone of zoneIds) {
      for (const id of SYMPTOM_IDS_BY_ZONE[zone]) allowed.add(id);
    }
  } else {
    for (const conditionId of conditions) {
      for (const id of SYMPTOM_IDS_BY_CONDITION[conditionId] ?? []) allowed.add(id);
    }
  }

  if (allowed.size === 0) {
    for (const id of [
      ...SYMPTOM_IDS_BY_ZONE.nose,
      ...SYMPTOM_IDS_BY_ZONE.eyes,
      ...SYMPTOM_IDS_BY_ZONE.skin,
      ...SYMPTOM_IDS_BY_ZONE.lungs,
    ]) {
      allowed.add(id);
    }
  }

  return SYMPTOM_CATALOG.filter((item) => allowed.has(item.id));
}

export function toggleSymptomZone(
  zoneIds: SymptomZoneId[],
  zoneId: SymptomZoneId,
): SymptomZoneId[] {
  return zoneIds.includes(zoneId)
    ? zoneIds.filter((id) => id !== zoneId)
    : [...zoneIds, zoneId];
}

export function toggleTypicalSymptomId(
  typicalSymptomIds: string[],
  symptomId: string,
  max = PROFILE_SYMPTOM_BASELINE_MAX_IDS,
): string[] {
  if (typicalSymptomIds.includes(symptomId)) {
    return typicalSymptomIds.filter((id) => id !== symptomId);
  }
  if (typicalSymptomIds.length >= max) return typicalSymptomIds;
  if (!SYMPTOM_CATALOG.some((item) => item.id === symptomId)) return typicalSymptomIds;
  return [...typicalSymptomIds, symptomId];
}
