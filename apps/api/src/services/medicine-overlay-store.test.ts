import { describe, expect, it } from 'vitest';
import type { MedicineCard } from '@allerguide/core';
import { mergeCatalogAndOverlayCards, overlayRowToCard } from './medicine-overlay-store';

const catalog: MedicineCard = {
  name: 'Нурофен',
  activeSubstance: 'ибупрофен',
  form: 'таблетки',
  strength: '200 мг',
  manufacturer: 'Reckitt',
  indications: '',
  ageUsage: [],
  minAgeYears: 12,
  ingredients: '',
  allergenTags: [],
  aliases: [],
  source: 'catalog',
  confidence: 'high',
};

const overlay: MedicineCard = {
  ...catalog,
  strength: '400 мг',
  source: 'manual',
};

describe('mergeCatalogAndOverlayCards', () => {
  it('lets the caller overlay replace a public catalog card with the same name', () => {
    const merged = mergeCatalogAndOverlayCards([catalog], [overlay]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.strength).toBe('400 мг');
    expect(merged[0]?.source).toBe('manual');
  });

  it('keeps catalog-only cards when the overlay is empty', () => {
    expect(mergeCatalogAndOverlayCards([catalog], [])).toEqual([catalog]);
  });

  it('preserves a stored vision source on the overlay card', () => {
    const card = overlayRowToCard({
      userId: 1,
      normalizedName: 'нурофен',
      name: catalog.name,
      activeSubstance: catalog.activeSubstance,
      form: catalog.form,
      strength: catalog.strength,
      manufacturer: catalog.manufacturer,
      indications: catalog.indications,
      ageUsage: catalog.ageUsage,
      minAgeYears: catalog.minAgeYears,
      ingredients: catalog.ingredients,
      allergenTags: catalog.allergenTags,
      aliases: catalog.aliases,
      source: 'vision',
      confidence: catalog.confidence,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(card.source).toBe('vision');
  });
});
