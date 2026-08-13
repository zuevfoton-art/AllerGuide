import {
  ALLERGY_CONFIRMATION_SOURCES,
  type AllergyConfirmationSource,
  type ProfileInput,
  type ProfileType,
  type Scenario,
} from '@allerguide/core';

const PROFILE_TYPES = new Set<ProfileType>(['self', 'child']);
const PROFILE_SCENARIOS = new Set<Scenario>(['self', 'child', 'both']);
const CONFIRMATION_SOURCES = new Set<AllergyConfirmationSource>(
  ALLERGY_CONFIRMATION_SOURCES,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return null;
  }
  return value;
}

function parseConfirmations(
  value: unknown,
): Record<string, AllergyConfirmationSource> | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const confirmations: Record<string, AllergyConfirmationSource> = {};
  for (const [allergenId, source] of Object.entries(value)) {
    if (typeof source !== 'string' || !CONFIRMATION_SOURCES.has(source as AllergyConfirmationSource)) {
      return null;
    }
    confirmations[allergenId] = source as AllergyConfirmationSource;
  }
  return confirmations;
}

export function parseProfileId(rawId: unknown): number | null {
  if (typeof rawId !== 'string') return null;
  if (!/^[1-9]\d*$/.test(rawId)) return null;
  const profileId = Number(rawId);
  return Number.isSafeInteger(profileId) ? profileId : null;
}

export function parseProfileInput(body: unknown): ProfileInput | null {
  if (!isRecord(body)) return null;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const birthYear = body.birthYear;
  const type = body.type;
  const allergies = parseStringArray(body.allergies);
  const crossReactionAllergies =
    body.crossReactionAllergies === undefined
      ? undefined
      : parseStringArray(body.crossReactionAllergies);
  const allergyConfirmations = parseConfirmations(body.allergyConfirmations);

  if (
    !name ||
    typeof birthYear !== 'number' ||
    !Number.isInteger(birthYear) ||
    typeof type !== 'string' ||
    !PROFILE_TYPES.has(type as ProfileType) ||
    allergies === null ||
    crossReactionAllergies === null ||
    allergyConfirmations === null
  ) {
    return null;
  }

  if (body.childConsent !== undefined && typeof body.childConsent !== 'boolean') {
    return null;
  }
  if (
    body.scenario !== undefined &&
    (typeof body.scenario !== 'string' || !PROFILE_SCENARIOS.has(body.scenario as Scenario))
  ) {
    return null;
  }

  return {
    name,
    birthYear,
    type: type as ProfileType,
    allergies,
    allergyConfirmations,
    crossReactionAllergies,
    childConsent: body.childConsent as boolean | undefined,
    scenario: body.scenario as Scenario | undefined,
  };
}
