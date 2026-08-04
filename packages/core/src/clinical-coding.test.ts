import { describe, expect, it } from 'vitest';
import { ALLERGENS } from './allergen-database';
import {
  buildCodedAllergyLines,
  formatCodedAllergiesReportText,
  getClinicalCoding,
  ALLERGEN_CLINICAL_CODES,
} from './clinical-coding';

describe('clinical coding crosswalk', () => {
  it('covers every catalog allergen with ICD-11 crosswalk', () => {
    for (const allergen of ALLERGENS) {
      expect(getClinicalCoding(allergen.id), allergen.id).toBeDefined();
    }
    expect(Object.keys(ALLERGEN_CLINICAL_CODES).length).toBe(ALLERGENS.length);
  });

  it('maps food allergens to ICD-11 CA08.3 and SNOMED', () => {
    const milk = getClinicalCoding('milk');
    expect(milk?.icd11).toBe('CA08.3');
    expect(milk?.snomed).toBe('425525006');
  });

  it('maps insect venom allergens to ICD-11 CA08.1', () => {
    expect(getClinicalCoding('bee-venom')?.icd11).toBe('CA08.1');
    expect(getClinicalCoding('wasp-venom')?.snomed).toBe('432674006');
  });

  it('maps drug allergens to ICD-11 CA08.2', () => {
    expect(getClinicalCoding('nsaid')?.icd11).toBe('CA08.2');
    expect(getClinicalCoding('cephalosporins')?.snomed).toBeTruthy();
  });

  it('maps pollen allergens to ICD-11 CA08.4', () => {
    const birch = getClinicalCoding('birch-pollen');
    expect(birch?.icd11).toBe('CA08.4');
    expect(birch?.snomed).toBeTruthy();
    expect(getClinicalCoding('alder-pollen')?.icd11).toBe('CA08.4');
    expect(getClinicalCoding('olive-pollen')?.icd11).toBe('CA08.4');
  });

  it('builds coded lines with confirmation labels', () => {
    const lines = buildCodedAllergyLines(['milk', 'peanut'], {
      milk: 'specific_ige',
      peanut: 'clinician',
    });

    expect(lines).toHaveLength(2);
    expect(lines[0].name).toBe('Молоко');
    expect(lines[0].confirmedByLabel).toBe('Подтверждено анализами');
    expect(lines[1].confirmedBy).toBe('clinician');
  });

  it('formats report text for doctor export', () => {
    const text = formatCodedAllergiesReportText(
      buildCodedAllergyLines(['milk'], { milk: 'self_reported' }),
    );
    expect(text).toContain('Молоко');
    expect(text).toContain('ICD-11: CA08.3');
    expect(text).toContain('SNOMED CT 425525006');
    expect(text).toContain('Самонаблюдение');
  });
});
