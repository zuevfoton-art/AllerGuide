import { resolveAllergenId } from './profile-allergens';

/** How an allergen entry was verified (Phase A.4). */
export type AllergyConfirmationSource = 'self_reported' | 'specific_ige' | 'clinician';

export const ALLERGY_CONFIRMATION_SOURCES: AllergyConfirmationSource[] = [
  'self_reported',
  'specific_ige',
  'clinician',
];

export const ALLERGY_CONFIRMATION_LABELS: Record<AllergyConfirmationSource, string> = {
  self_reported: 'Самоотчёт',
  specific_ige: 'Специфический IgE',
  clinician: 'Подтверждено врачом',
};

export type ProfileAllergyConfirmations = Record<string, AllergyConfirmationSource>;

export function parseAllergyConfirmations(json: string | undefined | null): ProfileAllergyConfirmations {
  if (!json?.trim()) return {};

  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const out: ProfileAllergyConfirmations = {};
    for (const [key, value] of Object.entries(parsed)) {
      const allergenId = resolveAllergenId(key);
      if (!allergenId) continue;
      if (value === 'self_reported' || value === 'specific_ige' || value === 'clinician') {
        out[allergenId] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeAllergyConfirmations(
  confirmations: ProfileAllergyConfirmations,
): string {
  const normalized: ProfileAllergyConfirmations = {};
  for (const [key, value] of Object.entries(confirmations)) {
    const allergenId = resolveAllergenId(key);
    if (!allergenId) continue;
    if (value === 'self_reported' || value === 'specific_ige' || value === 'clinician') {
      normalized[allergenId] = value;
    }
  }
  return JSON.stringify(normalized);
}

/** Align confirmations with current allergen ids; default missing entries to self_reported. */
export function normalizeAllergyConfirmations(
  allergenIds: string[],
  existing: ProfileAllergyConfirmations = {},
): ProfileAllergyConfirmations {
  const out: ProfileAllergyConfirmations = {};
  const unique = [...new Set(allergenIds.map(resolveAllergenId).filter((id): id is string => Boolean(id)))];

  for (const allergenId of unique) {
    out[allergenId] = existing[allergenId] ?? 'self_reported';
  }

  return out;
}

export function cycleConfirmationSource(
  current: AllergyConfirmationSource,
): AllergyConfirmationSource {
  const index = ALLERGY_CONFIRMATION_SOURCES.indexOf(current);
  const next = (index + 1) % ALLERGY_CONFIRMATION_SOURCES.length;
  return ALLERGY_CONFIRMATION_SOURCES[next] ?? 'self_reported';
}
