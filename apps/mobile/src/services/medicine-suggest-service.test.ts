import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeDiaryDetails, type MedicineCard } from '@allerguide/core';

const diaryEntries: { type: string; details: string }[] = [];

vi.mock('@/src/services/diary-service', () => ({
  getDiaryEntries: vi.fn(async () => diaryEntries),
}));

vi.mock('@/src/services/medicines-api', () => ({
  searchMedicinesFromCatalog: vi.fn(async () => []),
  rememberMedicineViaApi: vi.fn(async (card: MedicineCard) => card),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

function card(name: string, extras: Partial<MedicineCard> = {}): MedicineCard {
  return {
    name,
    activeSubstance: extras.activeSubstance ?? '',
    form: extras.form ?? '',
    strength: extras.strength ?? '',
    manufacturer: '',
    indications: extras.indications ?? '',
    ageUsage: [],
    minAgeYears: null,
    ingredients: '',
    allergenTags: [],
    aliases: extras.aliases ?? [],
    source: extras.source ?? 'catalog',
    confidence: extras.confidence ?? 'high',
  };
}

describe('medicine-suggest-service', () => {
  beforeEach(async () => {
    diaryEntries.length = 0;
    const { __resetRememberedMedicinesForTests } = await import('./medicine-suggest-service');
    __resetRememberedMedicinesForTests();
    const api = await import('./medicines-api');
    vi.mocked(api.searchMedicinesFromCatalog).mockResolvedValue([]);
    vi.mocked(api.rememberMedicineViaApi).mockImplementation(async (item) => item);
  });

  it('rebuilds cards from encoded diary details', async () => {
    const { collectMedicineCardsFromDiaryEntries, rankLocalMedicineSuggestions } = await import(
      './medicine-suggest-service'
    );
    const details = encodeDiaryDetails(
      { medicine: 'Цетиризин', dosage: '10 мг', medicineForm: 'таблетки' },
      'Лекарство',
    );
    const cards = collectMedicineCardsFromDiaryEntries([{ type: 'Лекарство', details }]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.name).toBe('Цетиризин');
    expect(rankLocalMedicineSuggestions('цет', cards).map((item) => item.name)).toEqual([
      'Цетиризин',
    ]);
  });

  it('rebuilds cards from АСИТ and therapy diary entries', async () => {
    const { collectMedicineCardsFromDiaryEntries } = await import('./medicine-suggest-service');
    const cards = collectMedicineCardsFromDiaryEntries([
      { type: 'АСИТ', details: encodeDiaryDetails({ asitDrug: 'Сталораль' }, 'АСИТ') },
      {
        type: 'Терапия',
        details: encodeDiaryDetails({ therapyDrug: 'Пульмикорт', therapyDosage: '200 мкг' }, 'Терапия'),
      },
    ]);
    expect(cards.map((item) => item.name).sort()).toEqual(['Пульмикорт', 'Сталораль']);
  });

  it('merges catalog hits with previously saved diary medicines', async () => {
    diaryEntries.push({
      type: 'Лекарство',
      details: JSON.stringify({
        v: 1,
        answers: { medicine: 'Цетиризин', dosage: '10 мг', medicineForm: 'таблетки' },
      }),
    });
    const api = await import('./medicines-api');
    vi.mocked(api.searchMedicinesFromCatalog).mockResolvedValueOnce([
      card('Цетиризин-Акри', { activeSubstance: 'цетиризин', strength: '10 мг' }),
    ]);

    const { searchMedicineSuggestions } = await import('./medicine-suggest-service');
    const hits = await searchMedicineSuggestions('цет', 1);
    expect(hits.map((item) => item.name)).toEqual(['Цетиризин', 'Цетиризин-Акри']);
  });

  it('ranks previously saved cards without waiting for the catalog', async () => {
    const { rememberMedicineCard, rankLocalMedicineSuggestions } = await import(
      './medicine-suggest-service'
    );
    await rememberMedicineCard(card('Цетиризин', { strength: '10 мг', source: 'manual' }));
    expect(rankLocalMedicineSuggestions('цет').map((item) => item.name)).toEqual(['Цетиризин']);
  });

  it('writes a found card through to the YC catalog', async () => {
    const api = await import('./medicines-api');
    const { rememberMedicineCard, resolveMedicineSuggestion } = await import(
      './medicine-suggest-service'
    );

    await rememberMedicineCard(card('Нурофен', { strength: '200 мг', source: 'ocr' }));
    expect(api.rememberMedicineViaApi).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Нурофен', strength: '200 мг' }),
    );

    const resolved = await resolveMedicineSuggestion('нурофен', null);
    expect(resolved?.name).toBe('Нурофен');
  });
});
