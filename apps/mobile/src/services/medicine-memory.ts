import {
  medicineCardKey,
  mergeMedicineCards,
  normalizeBarcode,
  offBarcodeLookupCandidates,
  type MedicineCard,
} from '@allerguide/core';

const rememberedByKey = new Map<string, MedicineCard>();

export function rememberMedicineCardLocally(card: MedicineCard): MedicineCard {
  const key = medicineCardKey(card);
  if (!key) return card;
  const previous = rememberedByKey.get(key);
  const merged = previous ? mergeMedicineCards(previous, card) : card;
  rememberedByKey.set(key, merged);
  return merged;
}

export function listRememberedMedicineCards(): MedicineCard[] {
  return [...rememberedByKey.values()];
}

export function findRememberedMedicineByBarcode(barcode: string): MedicineCard | null {
  const candidates = new Set(offBarcodeLookupCandidates(barcode));
  if (candidates.size === 0) return null;
  for (const card of rememberedByKey.values()) {
    const code = normalizeBarcode(card.barcode ?? '');
    if (code && candidates.has(code)) return card;
  }
  return null;
}

/** Test helper. */
export function __resetRememberedMedicinesForTests(): void {
  rememberedByKey.clear();
}
