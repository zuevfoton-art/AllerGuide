import { describe, expect, it } from 'vitest';
import {
  applyMedicineCardToSectionAnswers,
  buildMedicineCardFromDiaryAnswers,
  buildMedicinePrefillFromCard,
  filterAndRankMedicineSuggestions,
  formatMedicineSuggestionMeta,
  medicineCardKey,
  mergeMedicineCards,
  mergeMedicinePrefillFromCard,
  normalizeMedicineName,
  pickMedicineSuggestionForTypedName,
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

  it('ranks autocomplete hits prefix-first and skips unrelated cards', () => {
    const ranked = filterAndRankMedicineSuggestions('цет', [
      card({ name: 'Нурофен' }),
      card({ name: 'Цетиризин-Акри', activeSubstance: 'цетиризин', form: 'капли', strength: '10 мг/мл' }),
      card({ name: 'Цетиризин', activeSubstance: 'цетиризин', form: 'таблетки', strength: '10 мг' }),
    ]);
    expect(ranked.map((item) => item.name)).toEqual(['Цетиризин', 'Цетиризин-Акри']);
  });

  it('picks an exact typed name or a single unique prefix', () => {
    const cetirizine = card({ name: 'Цетиризин' });
    const acri = card({ name: 'Цетиризин-Акри' });
    expect(pickMedicineSuggestionForTypedName('Цетиризин', [cetirizine, acri])?.name).toBe(
      'Цетиризин',
    );
    expect(pickMedicineSuggestionForTypedName('цет', [cetirizine, acri])).toBeNull();
    expect(pickMedicineSuggestionForTypedName('цет', [cetirizine])?.name).toBe('Цетиризин');
  });

  it('rebuilds a card from diary answers and keeps richer catalog fields on merge', () => {
    const fromDiary = buildMedicineCardFromDiaryAnswers({
      medicine: 'Нурофен',
      dosage: '200 мг',
      medicineForm: 'таблетки',
    });
    expect(fromDiary?.strength).toBe('200 мг');
    expect(fromDiary?.source).toBe('manual');

    const merged = mergeMedicineCards(card(), fromDiary!);
    expect(merged.activeSubstance).toBe('ибупрофен');
    expect(merged.indications).toBe('боль, температура');
    expect(merged.strength).toBe('200 мг');
    expect(merged.source).toBe('vision');
  });

  it('warns when the selected brand matches an INN intolerance', () => {
    const prefill = buildMedicinePrefillFromCard(card({ name: 'Зиртек', activeSubstance: 'цетиризин' }), 30, [
      'цетиризин',
    ]);
    expect(prefill.intoleranceAlert).toMatch(/цетиризин/i);
  });

  it('ranks a Latin alias as an exact name hit', () => {
    const ranked = filterAndRankMedicineSuggestions('zyrtec', [
      card({ name: 'Зиртек', activeSubstance: 'цетиризин', aliases: ['Zyrtec'] }),
      card({ name: 'Нурофен' }),
    ]);
    expect(ranked.map((item) => item.name)).toEqual(['Зиртек']);
  });

  it('fills АСИТ and therapy name fields from a catalog card', () => {
    const asit = applyMedicineCardToSectionAnswers('АСИТ', { asitAllergen: 'берёза' }, card({ name: 'Сталораль' }), 30);
    expect(asit.asitDrug).toBe('Сталораль');
    expect(asit.asitAllergen).toBe('берёза');

    const therapy = applyMedicineCardToSectionAnswers(
      'Терапия',
      { therapyDrug: '' },
      card({ name: 'Пульмикорт', ageUsage: [{ dose: '200 мкг 2 раза в сутки' }], strength: '200 мкг' }),
      30,
    );
    expect(therapy.therapyDrug).toBe('Пульмикорт');
    expect(therapy.therapyDosage).toBe('200 мкг 2 раза в сутки');
  });

  it('fills empty diary fields from a card without overwriting a typed dose', () => {
    const filled = mergeMedicinePrefillFromCard(
      { medicine: 'нур', dosage: '1 таблетка' },
      card(),
      30,
      [],
      'fillEmpty',
    );
    expect(filled.medicine).toBe('нур');
    expect(filled.dosage).toBe('1 таблетка');
    expect(filled.medicineForm).toBe('таблетки');

    const replaced = mergeMedicinePrefillFromCard(
      { medicine: 'нур', dosage: '1 таблетка' },
      card(),
      30,
      [],
      'replace',
    );
    expect(replaced.medicine).toBe('Нурофен');
    expect(replaced.dosage).toBe('200 мг');
    expect(formatMedicineSuggestionMeta(card())).toBe('ибупрофен · таблетки · 200 мг');
  });
});
