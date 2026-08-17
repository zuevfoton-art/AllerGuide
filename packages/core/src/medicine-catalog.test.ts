import { describe, expect, it } from 'vitest';
import {
  buildMedicinePrefillFromCard,
  medicineCardKey,
  normalizeMedicineName,
  resolveMedicineAgeUsage,
  toMedicineCard,
  type MedicineCard,
} from './medicine-catalog';

function card(overrides: Partial<MedicineCard> = {}): MedicineCard {
  return {
    name: 'Нурофен',
    activeSubstance: 'ибупрофен',
    form: 'таблетки',
    strength: '200 мг',
    manufacturer: '',
    indications: 'боль, температура',
    ageUsage: [{ minAgeYears: 12, dose: '200 мг', note: 'с 12 лет' }],
    minAgeYears: 12,
    ingredients: 'ибупрофен, лактоза',
    allergenTags: ['lactose'],
    source: 'vision',
    confidence: 'medium',
    ...overrides,
  };
}

describe('medicine-catalog', () => {
  it('normalizes names for catalog dedupe', () => {
    expect(normalizeMedicineName('Нурофён, 200 мг!')).toBe('нурофен 200 мг');
    expect(medicineCardKey({ name: 'Нурофен' })).toBe('нурофен');
  });

  it('resolves an age band and warns when the profile is below min age', () => {
    const adult = resolveMedicineAgeUsage(card(), 30);
    expect(adult.dose).toBe('200 мг');
    expect(adult.blocked).toBe(false);

    const child = resolveMedicineAgeUsage(card(), 6);
    expect(child.blocked).toBe(true);
    expect(child.warning).toContain('до 12 лет');
    expect(child.dose).toBe('200 мг');
  });

  it('prefills diary answers from a recognized card and SOS intolerances', () => {
    const prefill = buildMedicinePrefillFromCard(card(), 6, ['ибупрофен']);
    expect(prefill.medicine).toBe('Нурофен');
    expect(prefill.dosage).toBe('200 мг');
    expect(prefill.medicineForm).toBe('таблетки');
    expect(prefill.medicineActiveSubstance).toBe('ибупрофен');
    expect(prefill.medicineUsage).toBe('боль, температура');
    expect(prefill.medicineAgeNote).toContain('до 12 лет');
    expect(prefill.medicineSource).toBe('vision');
    expect(prefill.intoleranceAlert).toMatch(/непереносимость/i);
  });

  it('fills missing card fields when normalizing a vision payload', () => {
    const normalized = toMedicineCard({ name: '  Цетиризин  ' }, 'ocr');
    expect(normalized.name).toBe('Цетиризин');
    expect(normalized.activeSubstance).toBe('');
    expect(normalized.source).toBe('ocr');
    expect(normalized.confidence).toBe('low');
  });
});
