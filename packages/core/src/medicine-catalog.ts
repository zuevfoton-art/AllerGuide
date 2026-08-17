import { buildIntoleranceAlert } from './food-drug-allergy';

export type MedicineConfidence = 'low' | 'medium' | 'high';
export type MedicineSource = 'catalog' | 'vision' | 'ocr' | 'manual';

export interface MedicineAgeUsage {
  minAgeYears?: number;
  maxAgeYears?: number;
  dose?: string;
  note?: string;
}

export interface MedicineCard {
  name: string;
  activeSubstance: string;
  form: string;
  strength: string;
  manufacturer: string;
  indications: string;
  ageUsage: MedicineAgeUsage[];
  minAgeYears: number | null;
  ingredients: string;
  allergenTags: string[];
  source: MedicineSource;
  confidence: MedicineConfidence;
}

export interface MedicineAgeResolution {
  dose?: string;
  note?: string;
  blocked: boolean;
  warning?: string;
}

const PUNCTUATION_PATTERN = /[^\p{L}\p{N}\s]+/gu;
const WHITESPACE_PATTERN = /\s+/g;

/** Dedupe key for catalog lookup: lowercase, ё→е, punctuation stripped. */
export function normalizeMedicineName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(PUNCTUATION_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
}

export function medicineCardKey(card: Pick<MedicineCard, 'name'>): string {
  return normalizeMedicineName(card.name);
}

/** Normalize a partial vision/OCR payload into a catalog card. */
export function toMedicineCard(
  input: Partial<MedicineCard> & Pick<MedicineCard, 'name'>,
  source: MedicineSource,
): MedicineCard {
  return {
    name: input.name.trim(),
    activeSubstance: input.activeSubstance?.trim() ?? '',
    form: input.form?.trim() ?? '',
    strength: input.strength?.trim() ?? '',
    manufacturer: input.manufacturer?.trim() ?? '',
    indications: input.indications?.trim() ?? '',
    ageUsage: input.ageUsage ?? [],
    minAgeYears: input.minAgeYears ?? null,
    ingredients: input.ingredients?.trim() ?? '',
    allergenTags: input.allergenTags ?? [],
    source,
    confidence: input.confidence ?? 'low',
  };
}

function usageMatchesAge(usage: MedicineAgeUsage, ageYears: number): boolean {
  if (usage.minAgeYears != null && ageYears < usage.minAgeYears) return false;
  if (usage.maxAgeYears != null && ageYears > usage.maxAgeYears) return false;
  return true;
}

/**
 * Picks the age band for a recognized medicine.
 * A min-age on the card is a warning, never a save-blocking dose.
 */
export function resolveMedicineAgeUsage(
  card: Pick<MedicineCard, 'ageUsage' | 'minAgeYears' | 'strength'>,
  ageYears: number | null,
): MedicineAgeResolution {
  const band =
    ageYears == null
      ? undefined
      : card.ageUsage.find((usage) => usageMatchesAge(usage, ageYears));

  const belowMinAge =
    ageYears != null && card.minAgeYears != null && ageYears < card.minAgeYears;
  const warning = belowMinAge
    ? `Не применяется до ${card.minAgeYears} лет — уточните у врача.`
    : band?.note?.trim() || undefined;

  return {
    dose: band?.dose?.trim() || card.strength.trim() || undefined,
    note: band?.note?.trim() || undefined,
    blocked: belowMinAge,
    warning,
  };
}

/** Prefills the «Лекарство» diary answers from a recognized card. Dosage stays editable. */
export function buildMedicinePrefillFromCard(
  card: MedicineCard,
  ageYears: number | null,
  drugIntolerances: string[] = [],
): Record<string, string> {
  const age = resolveMedicineAgeUsage(card, ageYears);
  const prefill: Record<string, string> = {
    medicine: card.name.trim(),
    medicineSource: card.source,
  };

  if (age.dose) prefill.dosage = age.dose;
  if (card.form.trim()) prefill.medicineForm = card.form.trim();
  if (card.activeSubstance.trim()) prefill.medicineActiveSubstance = card.activeSubstance.trim();
  if (card.indications.trim()) prefill.medicineUsage = card.indications.trim();
  if (age.warning) prefill.medicineAgeNote = age.warning;

  const alert = buildIntoleranceAlert(card.name, drugIntolerances);
  if (alert) prefill.intoleranceAlert = alert;

  return prefill;
}
