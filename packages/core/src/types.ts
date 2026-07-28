export type ProfileType = 'self' | 'child';
export type Scenario = 'self' | 'child' | 'both';
export type RiskLevel = 'low' | 'medium' | 'high';

export type { AllergyConfirmationSource } from './allergy-confirmations';

export interface Profile {
  id: number;
  userId?: number;
  name: string;
  birthYear: number;
  type: ProfileType;
  allergies: string;
  /** JSON map allergenId → confirmation source (`self_reported` | `specific_ige` | `clinician`). */
  allergyConfirmations?: string;
  /** JSON array of allergen ids accepted as cross-reactions — stored separately from primary allergies. */
  crossReactionAllergies?: string;
}

export interface DiaryEntry {
  id: number;
  profileId: number;
  type: string;
  details: string;
  createdAt: string;
}

export interface SafeProduct {
  id: number;
  profileId: number;
  name: string;
  mode: string;
  input: string;
  savedAt: string;
}

export interface ScanHistoryEntry {
  id: number;
  profileId: number;
  mode: string;
  input: string;
  verdict: string;
  matches: string;
  level: string;
  productName: string | null;
  source: string;
  createdAt: string;
}

export interface ProfileInput {
  name: string;
  birthYear: number;
  type: ProfileType;
  /** Canonical allergen ids (`milk`, `birch-pollen`, …). Legacy labels are normalized on save. */
  allergies: string[];
  /** Per-allergen verification source (defaults to `self_reported`). */
  allergyConfirmations?: Record<string, import('./allergy-confirmations').AllergyConfirmationSource>;
  /** Allergen ids accepted by the user as cross-reactions — stored separately from primary allergies. */
  crossReactionAllergies?: string[];
  /** Required when `type === 'child'` or onboarding scenario is `child`. */
  childConsent?: boolean;
  /** Onboarding scenario hint for consent validation. */
  scenario?: Scenario;
}
