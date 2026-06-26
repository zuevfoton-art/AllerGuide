import type { ProfileType, Scenario } from './types';
import { normalizeProfileAllergenIds } from './profile-allergens';

export type ProfileValidationErrorCode =
  | 'name_required'
  | 'birth_year_invalid'
  | 'allergen_required'
  | 'child_consent_required';

export interface ProfileValidationInput {
  name: string;
  birthYear: number;
  type: ProfileType;
  allergies: string[];
  childConsent?: boolean;
  scenario?: Scenario;
}

export function dedupeAllergenIds(allergenIds: string[]): string[] {
  return normalizeProfileAllergenIds(allergenIds);
}

export function needsChildConsent(type: ProfileType, scenario?: Scenario): boolean {
  return type === 'child' || scenario === 'child';
}

export function validateProfileInput(input: ProfileValidationInput): ProfileValidationErrorCode | null {
  if (!input.name.trim()) return 'name_required';

  const year = Number(input.birthYear);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(year) || year < 1900 || year > currentYear) {
    return 'birth_year_invalid';
  }

  const allergies = dedupeAllergenIds(input.allergies);
  if (allergies.length === 0) return 'allergen_required';

  if (needsChildConsent(input.type, input.scenario) && !input.childConsent) {
    return 'child_consent_required';
  }

  return null;
}
