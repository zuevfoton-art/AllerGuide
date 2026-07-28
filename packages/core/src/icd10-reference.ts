import type { ClinicalPhenotypeId } from './clinical-phenotypes';

/**
 * ICD-10 code entry — code + short plain-language description.
 * Used for informational reference display only, not for clinical coding.
 */
export interface Icd10Entry {
  code: string;
  description: string;
}

/**
 * Primary ICD-10 code(s) for each clinical phenotype.
 * Informational only — not a substitute for clinician coding.
 */
export const PHENOTYPE_ICD10_MAP: Partial<Record<ClinicalPhenotypeId, Icd10Entry[]>> = {
  'atopic-march-child': [
    { code: 'L20', description: 'Атопический дерматит' },
    { code: 'J30.1', description: 'Аллергический ринит' },
    { code: 'J45', description: 'Астма' },
  ],
  'aria-asthma': [
    { code: 'J30.1', description: 'Аллергический ринит' },
    { code: 'J45', description: 'Астма' },
  ],
  'aria-conjunctivitis': [
    { code: 'J30.1', description: 'Аллергический ринит' },
    { code: 'H10.1', description: 'Острый атопический конъюнктивит' },
  ],
  'food-anaphylaxis-risk': [
    { code: 'T78.1', description: 'Другой вид анафилактического шока' },
    { code: 'L27.2', description: 'Пищевой контактный дерматит' },
  ],
  'pollen-food-oas': [
    { code: 'J30.1', description: 'Аллергический ринит' },
    { code: 'K52.2', description: 'Аллергический гастроэнтерит' },
  ],
  'dustmite-seafood': [
    { code: 'J30.1', description: 'Аллергический ринит' },
    { code: 'L27.2', description: 'Пищевой контактный дерматит' },
  ],
  'insect-venom-severe': [
    { code: 'T63.4', description: 'Яд насекомых' },
    { code: 'T78.0', description: 'Анафилактический шок от пищи' },
  ],
  'drug-respiratory': [
    { code: 'J06.9', description: 'Острое ОРВИ' },
    { code: 'T78.4', description: 'Аллергия неуточнённая' },
  ],
  'adult-onset-food': [
    { code: 'L27.2', description: 'Пищевой контактный дерматит' },
    { code: 'T78.1', description: 'Другой вид анафилактического шока' },
  ],
  polysensitized: [
    { code: 'J30.1', description: 'Аллергический ринит' },
    { code: 'L20', description: 'Атопический дерматит' },
  ],
};

/** ICD-10 reference codes for core allergy condition types. Informational. */
export const CONDITION_ICD10_MAP: Record<string, Icd10Entry> = {
  food: { code: 'L27.2', description: 'Пищевой контактный дерматит' },
  rhinitis: { code: 'J30.1', description: 'Аллергический ринит от пыльцы' },
  asthma: { code: 'J45', description: 'Бронхиальная астма' },
  dermatitis: { code: 'L20', description: 'Атопический дерматит' },
  pollinosis: { code: 'J30.1', description: 'Аллергический ринит от пыльцы' },
  insect: { code: 'T63.4', description: 'Токсическое действие яда' },
  drug: { code: 'T78.4', description: 'Аллергия неуточнённая' },
  latex: { code: 'Z88.8', description: 'Непереносимость других препаратов' },
  animal: { code: 'J30.1', description: 'Аллергический ринит' },
  mold: { code: 'J30.1', description: 'Аллергический ринит' },
};

/** Returns ICD-10 entries for a given phenotype id, or empty array if not mapped. */
export function getPhenotypeIcd10(phenotypeId: ClinicalPhenotypeId): Icd10Entry[] {
  return PHENOTYPE_ICD10_MAP[phenotypeId] ?? [];
}

/** Returns the ICD-10 entry for a condition id, or undefined if not mapped. */
export function getConditionIcd10(conditionId: string): Icd10Entry | undefined {
  return CONDITION_ICD10_MAP[conditionId];
}

/** Compact code string for display: "J30.1, J45" */
export function formatIcd10Codes(entries: Icd10Entry[]): string {
  return entries.map((e) => e.code).join(', ');
}
