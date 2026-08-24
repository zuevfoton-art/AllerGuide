import { describe, expect, it, vi } from 'vitest';
import { findAllergenById, medicineCardKey } from '@allerguide/core';
import {
  findDuplicateKeys,
  readMedicineSeedEntries,
  seedEntryToCard,
  seedMedicines,
} from './seed-medicines';

const entries = readMedicineSeedEntries();

describe('allergy medicine dataset', () => {
  it('has entries and unique catalog keys', () => {
    expect(entries.length).toBeGreaterThan(50);
    expect(findDuplicateKeys(entries)).toEqual([]);
  });

  it('names every trade card with an active substance and no dose in the name', () => {
    for (const entry of entries) {
      expect(entry.name.trim(), 'name must be set').not.toBe('');
      expect(entry.activeSubstance.trim(), `activeSubstance for ${entry.name}`).not.toBe('');
      expect(entry.name, `${entry.name} must not carry a dose`).not.toMatch(
        /\d+\s*(мг|мкг|%|мг\/мл)/i,
      );
    }
  });

  it('keeps prescription-only cards free of dosing', () => {
    const prescription = entries.filter((entry) => entry.prescriptionOnly);
    expect(prescription.length).toBeGreaterThan(0);

    for (const entry of prescription) {
      for (const band of entry.ageUsage ?? []) {
        expect(band.dose, `${entry.name} must not prescribe a dose`).toBeUndefined();
        expect(band.note?.trim(), `${entry.name} needs a doctor note`).toBeTruthy();
      }
    }
  });

  it('normalizes an entry into a catalog card', () => {
    const card = seedEntryToCard({
      name: 'Зиртек',
      activeSubstance: 'цетиризин',
      form: 'таблетки',
      strength: '10 мг',
      minAgeYears: 6,
      ageUsage: [{ minAgeYears: 6, dose: '10 мг 1 раз в сутки' }],
      confidence: 'high',
    });

    expect(card.source).toBe('catalog');
    expect(card.confidence).toBe('high');
    expect(medicineCardKey(card)).toBe('зиртек');
    expect(card.allergenTags).toEqual([]);
  });

  it('maps external allergen terms onto canonical ids, like catalog.products', () => {
    const card = seedEntryToCard({
      name: 'Тестовый препарат',
      activeSubstance: 'тест',
      allergenTags: ['Milk', 'nsaid'],
    });
    expect(card.allergenTags).toEqual(['milk', 'nsaid']);
  });

  it('keeps manufacturer and ingredients together or leaves both empty', () => {
    for (const entry of entries) {
      const hasManufacturer = Boolean(entry.manufacturer?.trim());
      const hasIngredients = Boolean(entry.ingredients?.trim());
      expect(hasManufacturer, `${entry.name} manufacturer/ingredients must be paired`).toBe(
        hasIngredients,
      );
    }
  });

  it('uses only canonical allergen ids on cards that carry tags', () => {
    for (const entry of entries) {
      for (const tag of entry.allergenTags ?? []) {
        expect(findAllergenById(tag), `${entry.name} tag ${tag} must be an id`).toBeTruthy();
      }
    }
  });

  it('stores culprit allergen tags as taxonomy ids', () => {
    const nurofen = entries.find((entry) => entry.name === 'Нурофен');
    expect(nurofen?.allergenTags).toEqual(['nsaid']);
    const amoxiclav = entries.find((entry) => entry.name === 'Амоксиклав');
    expect(amoxiclav?.allergenTags).toEqual(['penicillin']);
    expect(seedEntryToCard(nurofen!).allergenTags).toEqual(['nsaid']);
  });

  it('covers the OTC, culprit, topical, asthma, biologic and ASIT names', () => {
    const names = new Set(entries.map((entry) => entry.name));
    for (const name of [
      'Фенкарол',
      'Виброцил',
      'Нурофен',
      'Элоком',
      'Элидел',
      'Пульмикорт',
      'Дупиксент',
      'Сталораль',
    ]) {
      expect(names.has(name), name).toBe(true);
    }
  });

  it('keeps a Latin alias on well-known international brands', () => {
    const zyrtec = entries.find((entry) => entry.name === 'Зиртек');
    expect(zyrtec?.aliases).toContain('Zyrtec');
    expect(seedEntryToCard(zyrtec!).aliases).toContain('Zyrtec');
  });
});

describe('seedMedicines', () => {
  it('posts each card with the write key and counts failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: 'Medicine name is required' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const stats = await seedMedicines({
      baseUrl: 'https://api.example.test',
      writeKey: 'seed-secret',
      requestDelayMs: 0,
      entries: [
        { name: 'Зиртек', activeSubstance: 'цетиризин' },
        { name: 'Цетрин', activeSubstance: 'цетиризин' },
      ],
    });

    expect(stats).toEqual({ total: 2, saved: 1, failed: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/medicines');
    expect((init as { headers: Record<string, string> }).headers['x-medicine-write-key']).toBe(
      'seed-secret',
    );

    vi.unstubAllGlobals();
  });

  it('retries once when the API answers 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '0' }),
        json: async () => ({ error: 'Too many scan requests' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const stats = await seedMedicines({
      baseUrl: 'https://api.example.test',
      writeKey: 'seed-secret',
      requestDelayMs: 0,
      entries: [{ name: 'Зиртек', activeSubstance: 'цетиризин' }],
    });

    expect(stats.saved).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});
