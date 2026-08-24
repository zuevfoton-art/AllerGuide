import {
  buildMedicineCardFromDiaryAnswers,
  filterAndRankMedicineSuggestions,
  getDiaryEntryAnswers,
  medicineCardKey,
  mergeMedicineCards,
  pickMedicineSuggestionForTypedName,
  toMedicineCard,
  type MedicineCard,
} from '@allerguide/core';
import { getDiaryEntries } from '@/src/services/diary-service';
import { logCaughtError } from '@/src/services/error-reporting';
import {
  rememberMedicineViaApi,
  searchMedicinesFromCatalog,
} from '@/src/services/medicines-api';

const rememberedByKey = new Map<string, MedicineCard>();

function rememberLocally(card: MedicineCard): MedicineCard {
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

/** Test helper. */
export function __resetRememberedMedicinesForTests(): void {
  rememberedByKey.clear();
}

export function collectMedicineCardsFromDiaryEntries(
  entries: { type: string; details: string }[],
): MedicineCard[] {
  const byKey = new Map<string, MedicineCard>();
  for (const entry of entries) {
    const answers = getDiaryEntryAnswers(entry.type, entry.details);
    if (!answers) continue;

    let card: MedicineCard | null = null;
    if (entry.type === 'Лекарство') {
      card = buildMedicineCardFromDiaryAnswers(answers);
    } else if (entry.type === 'АСИТ' && answers.asitDrug?.trim()) {
      card = toMedicineCard({ name: answers.asitDrug }, 'manual');
    } else if (entry.type === 'Терапия' && answers.therapyDrug?.trim()) {
      card = toMedicineCard(
        { name: answers.therapyDrug, strength: answers.therapyDosage },
        'manual',
      );
    }
    if (!card) continue;
    const key = medicineCardKey(card);
    const previous = byKey.get(key);
    byKey.set(key, previous ? mergeMedicineCards(previous, card) : card);
  }
  return [...byKey.values()];
}

async function loadDiaryMedicineCards(profileId?: number | null): Promise<MedicineCard[]> {
  if (!profileId) return [];
  try {
    const entries = await getDiaryEntries(profileId);
    return collectMedicineCardsFromDiaryEntries(entries);
  } catch (error) {
    logCaughtError('loadDiaryMedicineCards', error, { extra: { profileId: String(profileId) } });
    return [];
  }
}

export function rankLocalMedicineSuggestions(
  query: string,
  extraCards: MedicineCard[] = [],
): MedicineCard[] {
  return filterAndRankMedicineSuggestions(query, [
    ...extraCards,
    ...listRememberedMedicineCards(),
  ]);
}

/** Previously saved / remembered cards first; YC catalog merges in when it answers. */
export async function searchMedicineSuggestions(
  query: string,
  profileId?: number | null,
  extraCards: MedicineCard[] = [],
): Promise<MedicineCard[]> {
  const [remote, diaryCards] = await Promise.all([
    searchMedicinesFromCatalog(query),
    extraCards.length > 0 ? Promise.resolve([]) : loadDiaryMedicineCards(profileId),
  ]);
  for (const card of remote) rememberLocally(card);
  return filterAndRankMedicineSuggestions(query, [
    ...remote,
    ...diaryCards,
    ...extraCards,
    ...listRememberedMedicineCards(),
  ]);
}

export async function resolveMedicineSuggestion(
  query: string,
  profileId?: number | null,
  extraCards: MedicineCard[] = [],
): Promise<MedicineCard | null> {
  const localHit = pickMedicineSuggestionForTypedName(
    query,
    rankLocalMedicineSuggestions(query, extraCards),
  );
  if (localHit) return localHit;
  const suggestions = await searchMedicineSuggestions(query, profileId, extraCards);
  return pickMedicineSuggestionForTypedName(query, suggestions);
}

/** Cache locally and write through to the YC catalog. */
export async function rememberMedicineCard(card: MedicineCard): Promise<MedicineCard> {
  const local = rememberLocally(card);
  const saved = await rememberMedicineViaApi(local);
  return saved ? rememberLocally(saved) : local;
}

export async function rememberMedicineFromDiaryAnswers(
  answers: Record<string, string>,
): Promise<MedicineCard | null> {
  const card = buildMedicineCardFromDiaryAnswers(answers);
  if (!card) return null;
  return rememberMedicineCard(card);
}
