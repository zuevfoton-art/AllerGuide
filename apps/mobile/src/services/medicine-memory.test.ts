import { beforeEach, describe, expect, it } from 'vitest';
import type { MedicineCard } from '@allerguide/core';
import {
  __resetRememberedMedicinesForTests,
  findRememberedMedicineByBarcode,
  rememberMedicineCardLocally,
} from './medicine-memory';

function card(overrides: Partial<MedicineCard> = {}): MedicineCard {
  return {
    name: 'Зиртек',
    activeSubstance: 'цетиризин',
    form: 'таблетки',
    strength: '10 мг',
    manufacturer: '',
    indications: '',
    ageUsage: [],
    minAgeYears: null,
    ingredients: '',
    allergenTags: [],
    aliases: [],
    source: 'manual',
    confidence: 'medium',
    ...overrides,
  };
}

describe('medicine-memory barcode cache', () => {
  beforeEach(() => {
    __resetRememberedMedicinesForTests();
  });

  it('finds a remembered pack by GTIN, including a UPC leading-zero variant', () => {
    rememberMedicineCardLocally(card({ barcode: '0366479803106' }));
    expect(findRememberedMedicineByBarcode('366479803106')?.name).toBe('Зиртек');
    expect(findRememberedMedicineByBarcode('0366479803106')?.name).toBe('Зиртек');
  });

  it('keeps the GTIN when a later thinner card is remembered', () => {
    rememberMedicineCardLocally(card({ barcode: '3664798031065', ingredients: 'лактоза' }));
    rememberMedicineCardLocally(card({ barcode: '', ingredients: '' }));
    expect(findRememberedMedicineByBarcode('3664798031065')?.ingredients).toBe('лактоза');
  });

  it('ignores packs without a barcode', () => {
    rememberMedicineCardLocally(card({ barcode: undefined }));
    expect(findRememberedMedicineByBarcode('3664798031065')).toBeNull();
  });
});
