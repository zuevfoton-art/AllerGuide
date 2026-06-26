import { describe, expect, it } from 'vitest';
import {
  buildCodedAllergyLines,
  formatCodedAllergiesReportText,
  getClinicalCoding,
} from './clinical-coding';

describe('clinical coding crosswalk', () => {
  it('maps food allergens to ICD-11 CA08.3 and SNOMED', () => {
    const milk = getClinicalCoding('milk');
    expect(milk?.icd11).toBe('CA08.3');
    expect(milk?.snomed).toBe('425525006');
  });

  it('maps pollen allergens to ICD-11 CA08.4', () => {
    const birch = getClinicalCoding('birch-pollen');
    expect(birch?.icd11).toBe('CA08.4');
    expect(birch?.snomed).toBeTruthy();
  });

  it('builds coded lines with confirmation labels', () => {
    const lines = buildCodedAllergyLines(['milk', 'peanut'], {
      milk: 'specific_ige',
      peanut: 'clinician',
    });

    expect(lines).toHaveLength(2);
    expect(lines[0].name).toBe('Молоко');
    expect(lines[0].confirmedByLabel).toBe('Специфический IgE');
    expect(lines[1].confirmedBy).toBe('clinician');
  });

  it('formats report text for doctor export', () => {
    const text = formatCodedAllergiesReportText(
      buildCodedAllergyLines(['milk'], { milk: 'self_reported' }),
    );
    expect(text).toContain('Молоко');
    expect(text).toContain('ICD-11: CA08.3');
    expect(text).toContain('SNOMED CT 425525006');
    expect(text).toContain('Самоотчёт');
  });
});
