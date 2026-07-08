import { findAllergenById } from './allergen-database';
import {
  ALLERGY_CONFIRMATION_LABELS,
  type AllergyConfirmationSource,
} from './allergy-confirmations';

export interface ClinicalCoding {
  allergenId: string;
  icd11: string;
  icd11Label: string;
  snomed: string;
  snomedLabel: string;
}

/** Canonical allergen id → ICD-11 / SNOMED CT crosswalk (subset aligned with EAACI taxonomy). */
export const ALLERGEN_CLINICAL_CODES: Record<string, ClinicalCoding> = {
  milk: {
    allergenId: 'milk',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — milk',
    snomed: '425525006',
    snomedLabel: 'Allergy to cow milk protein',
  },
  eggs: {
    allergenId: 'eggs',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — egg',
    snomed: '91934008',
    snomedLabel: 'Allergy to egg protein',
  },
  peanut: {
    allergenId: 'peanut',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — peanut',
    snomed: '91935009',
    snomedLabel: 'Allergy to peanut',
  },
  'tree-nuts': {
    allergenId: 'tree-nuts',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — tree nut',
    snomed: '91936005',
    snomedLabel: 'Allergy to nut',
  },
  fish: {
    allergenId: 'fish',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — fish',
    snomed: '417532002',
    snomedLabel: 'Allergy to fish',
  },
  seafood: {
    allergenId: 'seafood',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — crustacean / mollusc',
    snomed: '300913006',
    snomedLabel: 'Shellfish allergy',
  },
  'wheat-gluten': {
    allergenId: 'wheat-gluten',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — wheat / gluten',
    snomed: '91927004',
    snomedLabel: 'Allergy to wheat',
  },
  soy: {
    allergenId: 'soy',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — soy',
    snomed: '91938008',
    snomedLabel: 'Allergy to soy protein',
  },
  sesame: {
    allergenId: 'sesame',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — sesame',
    snomed: '782555009',
    snomedLabel: 'Allergy to sesame seed',
  },
  celery: {
    allergenId: 'celery',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — celery',
    snomed: '782594005',
    snomedLabel: 'Allergy to celery',
  },
  mustard: {
    allergenId: 'mustard',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — mustard',
    snomed: '782597003',
    snomedLabel: 'Allergy to mustard',
  },
  lupin: {
    allergenId: 'lupin',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — lupin',
    snomed: '782598008',
    snomedLabel: 'Allergy to lupin',
  },
  sulphites: {
    allergenId: 'sulphites',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — sulphite',
    snomed: '294619002',
    snomedLabel: 'Sulfite adverse reaction',
  },
  'birch-pollen': {
    allergenId: 'birch-pollen',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — birch pollen',
    snomed: '260152009',
    snomedLabel: 'Birch pollen allergy',
  },
  'grass-pollen': {
    allergenId: 'grass-pollen',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — grass pollen',
    snomed: '418689008',
    snomedLabel: 'Grass pollen allergy',
  },
  'ragweed-pollen': {
    allergenId: 'ragweed-pollen',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — ragweed pollen',
    snomed: '300910004',
    snomedLabel: 'Ragweed pollen allergy',
  },
  'dust-mites': {
    allergenId: 'dust-mites',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — house dust mite',
    snomed: '419271008',
    snomedLabel: 'House dust mite allergy',
  },
  'cat-dander': {
    allergenId: 'cat-dander',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — cat dander',
    snomed: '419063004',
    snomedLabel: 'Cat dander allergy',
  },
  'dog-dander': {
    allergenId: 'dog-dander',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — dog dander',
    snomed: '418785008',
    snomedLabel: 'Dog dander allergy',
  },
  penicillin: {
    allergenId: 'penicillin',
    icd11: 'CA08.2',
    icd11Label: 'Drug hypersensitivity — penicillin',
    snomed: '294505008',
    snomedLabel: 'Allergy to penicillin',
  },
  'insect-stings': {
    allergenId: 'insect-stings',
    icd11: 'CA08.1',
    icd11Label: 'Insect venom hypersensitivity',
    snomed: '424213003',
    snomedLabel: 'Allergy to insect venom',
  },
  'bee-venom': {
    allergenId: 'bee-venom',
    icd11: 'CA08.1',
    icd11Label: 'Insect venom hypersensitivity — honeybee',
    snomed: '288328006',
    snomedLabel: 'Allergy to bee venom',
  },
  'wasp-venom': {
    allergenId: 'wasp-venom',
    icd11: 'CA08.1',
    icd11Label: 'Insect venom hypersensitivity — wasp',
    snomed: '432674006',
    snomedLabel: 'Allergy to wasp venom',
  },
  'hornet-venom': {
    allergenId: 'hornet-venom',
    icd11: 'CA08.1',
    icd11Label: 'Insect venom hypersensitivity — hornet',
    snomed: '424213003',
    snomedLabel: 'Allergy to hornet venom',
  },
  mosquito: {
    allergenId: 'mosquito',
    icd11: 'CA08.1',
    icd11Label: 'Insect bite hypersensitivity — mosquito',
    snomed: '260147004',
    snomedLabel: 'Allergy to mosquito bite',
  },
  'goat-milk': {
    allergenId: 'goat-milk',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — goat milk',
    snomed: '782596002',
    snomedLabel: 'Allergy to goat milk protein',
  },
  hazelnut: {
    allergenId: 'hazelnut',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — hazelnut',
    snomed: '91937006',
    snomedLabel: 'Allergy to hazelnut',
  },
  beef: {
    allergenId: 'beef',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — beef',
    snomed: '418279003',
    snomedLabel: 'Allergy to beef',
  },
  chicken: {
    allergenId: 'chicken',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — chicken',
    snomed: '419210001',
    snomedLabel: 'Allergy to chicken meat',
  },
  pork: {
    allergenId: 'pork',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — pork',
    snomed: '418815008',
    snomedLabel: 'Allergy to pork',
  },
  citrus: {
    allergenId: 'citrus',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — citrus fruit',
    snomed: '91939001',
    snomedLabel: 'Allergy to citrus fruit',
  },
  apple: {
    allergenId: 'apple',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — apple',
    snomed: '91940005',
    snomedLabel: 'Allergy to apple',
  },
  carrot: {
    allergenId: 'carrot',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — carrot',
    snomed: '91941009',
    snomedLabel: 'Allergy to carrot',
  },
  banana: {
    allergenId: 'banana',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — banana',
    snomed: '91942002',
    snomedLabel: 'Allergy to banana',
  },
  kiwi: {
    allergenId: 'kiwi',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — kiwi',
    snomed: '91943007',
    snomedLabel: 'Allergy to kiwi fruit',
  },
  avocado: {
    allergenId: 'avocado',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — avocado',
    snomed: '91944001',
    snomedLabel: 'Allergy to avocado',
  },
  strawberry: {
    allergenId: 'strawberry',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — strawberry',
    snomed: '91945000',
    snomedLabel: 'Allergy to strawberry',
  },
  tomato: {
    allergenId: 'tomato',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — tomato',
    snomed: '91946004',
    snomedLabel: 'Allergy to tomato',
  },
  honey: {
    allergenId: 'honey',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — honey',
    snomed: '294847008',
    snomedLabel: 'Allergy to honey',
  },
  melon: {
    allergenId: 'melon',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — melon / cucurbit',
    snomed: '782599000',
    snomedLabel: 'Allergy to melon',
  },
  chestnut: {
    allergenId: 'chestnut',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — chestnut',
    snomed: '782600002',
    snomedLabel: 'Allergy to chestnut',
  },
  rye: {
    allergenId: 'rye',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — rye',
    snomed: '782601003',
    snomedLabel: 'Allergy to rye',
  },
  barley: {
    allergenId: 'barley',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — barley',
    snomed: '782602005',
    snomedLabel: 'Allergy to barley',
  },
  'other-fish': {
    allergenId: 'other-fish',
    icd11: 'CA08.3',
    icd11Label: 'Food hypersensitivity — fish (other species)',
    snomed: '417532002',
    snomedLabel: 'Allergy to fish',
  },
  'mugwort-pollen': {
    allergenId: 'mugwort-pollen',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — mugwort pollen',
    snomed: '418689008',
    snomedLabel: 'Mugwort pollen allergy',
  },
  'house-dust': {
    allergenId: 'house-dust',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — house dust',
    snomed: '390952000',
    snomedLabel: 'House dust allergy',
  },
  mold: {
    allergenId: 'mold',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — mold',
    snomed: '419271008',
    snomedLabel: 'Mold allergy',
  },
  latex: {
    allergenId: 'latex',
    icd11: 'CA08.0',
    icd11Label: 'Contact hypersensitivity — latex',
    snomed: '300916003',
    snomedLabel: 'Allergy to latex',
  },
  aspirin: {
    allergenId: 'aspirin',
    icd11: 'CA08.2',
    icd11Label: 'Drug hypersensitivity — aspirin / NSAID',
    snomed: '293586002',
    snomedLabel: 'Allergy to aspirin',
  },
  nsaid: {
    allergenId: 'nsaid',
    icd11: 'CA08.2',
    icd11Label: 'Drug hypersensitivity — NSAID',
    snomed: '293584004',
    snomedLabel: 'Non-steroidal anti-inflammatory drug allergy',
  },
  cephalosporins: {
    allergenId: 'cephalosporins',
    icd11: 'CA08.2',
    icd11Label: 'Drug hypersensitivity — cephalosporin',
    snomed: '294532006',
    snomedLabel: 'Allergy to cephalosporin',
  },
  paracetamol: {
    allergenId: 'paracetamol',
    icd11: 'CA08.2',
    icd11Label: 'Drug hypersensitivity — paracetamol',
    snomed: '373270004',
    snomedLabel: 'Paracetamol adverse reaction',
  },
  rodent: {
    allergenId: 'rodent',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — rodent dander',
    snomed: '419598008',
    snomedLabel: 'Rodent allergy',
  },
  bird: {
    allergenId: 'bird',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — bird feathers',
    snomed: '419063004',
    snomedLabel: 'Bird feather allergy',
  },
  horse: {
    allergenId: 'horse',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — horse dander',
    snomed: '418947001',
    snomedLabel: 'Horse dander allergy',
  },
  rabbit: {
    allergenId: 'rabbit',
    icd11: 'CA08.4',
    icd11Label: 'Allergic rhinitis — rabbit dander',
    snomed: '418785008',
    snomedLabel: 'Rabbit dander allergy',
  },
};

export interface CodedAllergyLine {
  allergenId: string;
  name: string;
  icd11: string;
  icd11Label: string;
  snomed: string;
  snomedLabel: string;
  confirmedBy: AllergyConfirmationSource;
  confirmedByLabel: string;
}

export function getClinicalCoding(allergenId: string): ClinicalCoding | undefined {
  return ALLERGEN_CLINICAL_CODES[allergenId];
}

export function buildCodedAllergyLines(
  allergenIds: string[],
  confirmations: Record<string, AllergyConfirmationSource> = {},
): CodedAllergyLine[] {
  const lines: CodedAllergyLine[] = [];

  for (const allergenId of allergenIds) {
    const record = findAllergenById(allergenId);
    const coding = getClinicalCoding(allergenId);
    const confirmedBy = confirmations[allergenId] ?? 'self_reported';

    lines.push({
      allergenId,
      name: record?.name ?? allergenId,
      icd11: coding?.icd11 ?? 'CA08.Z',
      icd11Label: coding?.icd11Label ?? 'Hypersensitivity reaction, unspecified',
      snomed: coding?.snomed ?? '',
      snomedLabel: coding?.snomedLabel ?? record?.name ?? allergenId,
      confirmedBy,
      confirmedByLabel: ALLERGY_CONFIRMATION_LABELS[confirmedBy],
    });
  }

  return lines;
}

export function formatCodedAllergiesReportText(lines: CodedAllergyLine[]): string {
  if (!lines.length) return 'Аллергены профиля не указаны.';

  return lines
    .map((line) => {
      const snomedPart = line.snomed ? `SNOMED CT ${line.snomed} (${line.snomedLabel})` : line.snomedLabel;
      return [
        `• ${line.name}`,
        `  ICD-11: ${line.icd11} — ${line.icd11Label}`,
        `  ${snomedPart}`,
        `  Подтверждение: ${line.confirmedByLabel}`,
      ].join('\n');
    })
    .join('\n\n');
}

export function formatCodedAllergiesReportHtml(lines: CodedAllergyLine[]): string {
  if (!lines.length) {
    return '<p>Аллергены профиля не указаны.</p>';
  }

  return `<ul>${lines
    .map(
      (line) =>
        `<li><strong>${line.name}</strong><br/>` +
        `ICD-11: ${line.icd11} — ${line.icd11Label}<br/>` +
        (line.snomed
          ? `SNOMED CT: ${line.snomed} (${line.snomedLabel})<br/>`
          : `${line.snomedLabel}<br/>`) +
        `Подтверждение: ${line.confirmedByLabel}</li>`,
    )
    .join('')}</ul>`;
}
