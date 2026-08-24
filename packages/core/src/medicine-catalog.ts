import { buildIntoleranceAlert } from './food-drug-allergy';

export type MedicineConfidence = 'low' | 'medium' | 'high';
export type MedicineSource = 'catalog' | 'vision' | 'ocr' | 'manual';

export interface MedicineAgeUsage {
  minAgeYears?: number;
  maxAgeYears?: number;
  dose?: string;
  note?: string;
}

export interface MedicineCard {
  name: string;
  activeSubstance: string;
  form: string;
  strength: string;
  manufacturer: string;
  indications: string;
  ageUsage: MedicineAgeUsage[];
  minAgeYears: number | null;
  ingredients: string;
  allergenTags: string[];
  /** Latin / alternate trade names used in search (e.g. Zyrtec for Зиртек). */
  aliases?: string[];
  source: MedicineSource;
  confidence: MedicineConfidence;
}

/** Diary steps that type a medicine name and should offer catalog autocomplete. */
export const DIARY_MEDICINE_NAME_STEP_IDS: Record<string, string> = {
  Лекарство: 'medicine',
  АСИТ: 'asitDrug',
  Терапия: 'therapyDrug',
};

export function diaryMedicineNameStepId(sectionType: string): string | undefined {
  return DIARY_MEDICINE_NAME_STEP_IDS[sectionType];
}

export function isDiaryMedicineNameStep(sectionType: string, stepId: string): boolean {
  return diaryMedicineNameStepId(sectionType) === stepId;
}

export interface MedicineAgeResolution {
  dose?: string;
  note?: string;
  blocked: boolean;
  warning?: string;
}

const PUNCTUATION_PATTERN = /[^\p{L}\p{N}\s]+/gu;
const WHITESPACE_PATTERN = /\s+/g;

/** Dedupe key for catalog lookup: lowercase, ё→е, punctuation stripped. */
export function normalizeMedicineName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(PUNCTUATION_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
}

export function medicineCardKey(card: Pick<MedicineCard, 'name'>): string {
  return normalizeMedicineName(card.name);
}

/** Deduped, trimmed aliases. Empty strings and the card's own name are dropped. */
export function normalizeMedicineAliases(
  aliases: string[] | undefined,
  name = '',
): string[] {
  const ownKey = normalizeMedicineName(name);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of aliases ?? []) {
    const trimmed = raw.trim();
    const key = normalizeMedicineName(trimmed);
    if (!trimmed || !key || key === ownKey || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Normalize a partial vision/OCR payload into a catalog card. */
export function toMedicineCard(
  input: Partial<MedicineCard> & Pick<MedicineCard, 'name'>,
  source: MedicineSource,
): MedicineCard {
  const name = input.name.trim();
  return {
    name,
    activeSubstance: input.activeSubstance?.trim() ?? '',
    form: input.form?.trim() ?? '',
    strength: input.strength?.trim() ?? '',
    manufacturer: input.manufacturer?.trim() ?? '',
    indications: input.indications?.trim() ?? '',
    ageUsage: input.ageUsage ?? [],
    minAgeYears: input.minAgeYears ?? null,
    ingredients: input.ingredients?.trim() ?? '',
    allergenTags: input.allergenTags ?? [],
    aliases: normalizeMedicineAliases(input.aliases, name),
    source,
    confidence: input.confidence ?? 'low',
  };
}

function usageMatchesAge(usage: MedicineAgeUsage, ageYears: number): boolean {
  if (usage.minAgeYears != null && ageYears < usage.minAgeYears) return false;
  if (usage.maxAgeYears != null && ageYears > usage.maxAgeYears) return false;
  return true;
}

/**
 * Picks the age band for a recognized medicine.
 * A min-age on the card is a warning, never a save-blocking dose.
 */
export function resolveMedicineAgeUsage(
  card: Pick<MedicineCard, 'ageUsage' | 'minAgeYears' | 'strength'>,
  ageYears: number | null,
): MedicineAgeResolution {
  const band =
    ageYears == null
      ? undefined
      : card.ageUsage.find((usage) => usageMatchesAge(usage, ageYears));

  const belowMinAge =
    ageYears != null && card.minAgeYears != null && ageYears < card.minAgeYears;
  const warning = belowMinAge
    ? `Не применяется до ${card.minAgeYears} лет — уточните у врача.`
    : band?.note?.trim() || undefined;

  return {
    dose: band?.dose?.trim() || card.strength.trim() || undefined,
    note: band?.note?.trim() || undefined,
    blocked: belowMinAge,
    warning,
  };
}

export const MEDICINE_SUGGESTION_MIN_QUERY = 2;
export const MEDICINE_SUGGESTION_LIMIT = 8;

const MEDICINE_SOURCE_RANK: Record<MedicineSource, number> = {
  catalog: 3,
  vision: 2,
  ocr: 1,
  manual: 0,
};

const MEDICINE_CONFIDENCE_RANK: Record<MedicineConfidence, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

/** Prefills the «Лекарство» diary answers from a recognized card. Dosage stays editable. */
export function buildMedicinePrefillFromCard(
  card: MedicineCard,
  ageYears: number | null,
  drugIntolerances: string[] = [],
): Record<string, string> {
  const age = resolveMedicineAgeUsage(card, ageYears);
  const prefill: Record<string, string> = {
    medicine: card.name.trim(),
    medicineSource: card.source,
  };

  if (age.dose) prefill.dosage = age.dose;
  if (card.form.trim()) prefill.medicineForm = card.form.trim();
  if (card.activeSubstance.trim()) prefill.medicineActiveSubstance = card.activeSubstance.trim();
  if (card.indications.trim()) prefill.medicineUsage = card.indications.trim();
  if (age.warning) prefill.medicineAgeNote = age.warning;

  const alert = buildIntoleranceAlert(card.name, drugIntolerances, [card.activeSubstance]);
  if (alert) prefill.intoleranceAlert = alert;

  return prefill;
}

/**
 * Merge a catalog card into diary answers.
 * `replace` is for a tapped suggestion; `fillEmpty` keeps what the user already typed.
 */
export function mergeMedicinePrefillFromCard(
  current: Record<string, string>,
  card: MedicineCard,
  ageYears: number | null,
  drugIntolerances: string[] = [],
  mode: 'replace' | 'fillEmpty' = 'replace',
): Record<string, string> {
  const incoming = buildMedicinePrefillFromCard(card, ageYears, drugIntolerances);
  if (mode === 'replace') {
    return { ...current, ...incoming };
  }

  const next = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (!next[key]?.trim()) next[key] = value;
  }
  return next;
}

function pickRicherText(existing: string, incoming: string): string {
  const left = existing.trim();
  const right = incoming.trim();
  if (!right) return left;
  if (!left) return right;
  return right.length >= left.length ? right : left;
}

function pickRicherSource(existing: MedicineSource, incoming: MedicineSource): MedicineSource {
  return MEDICINE_SOURCE_RANK[incoming] >= MEDICINE_SOURCE_RANK[existing] ? incoming : existing;
}

function pickRicherConfidence(
  existing: MedicineConfidence,
  incoming: MedicineConfidence,
): MedicineConfidence {
  return MEDICINE_CONFIDENCE_RANK[incoming] >= MEDICINE_CONFIDENCE_RANK[existing]
    ? incoming
    : existing;
}

function mergeAliasLists(existing: MedicineCard, incoming: MedicineCard, name: string): string[] {
  return normalizeMedicineAliases([...(existing.aliases ?? []), ...(incoming.aliases ?? [])], name);
}

/** Keep the richer catalog card when a later find/manual save is thinner. */
export function mergeMedicineCards(existing: MedicineCard, incoming: MedicineCard): MedicineCard {
  const name = pickRicherText(existing.name, incoming.name) || incoming.name.trim();
  return {
    name,
    activeSubstance: pickRicherText(existing.activeSubstance, incoming.activeSubstance),
    form: pickRicherText(existing.form, incoming.form),
    strength: pickRicherText(existing.strength, incoming.strength),
    manufacturer: pickRicherText(existing.manufacturer, incoming.manufacturer),
    indications: pickRicherText(existing.indications, incoming.indications),
    ageUsage: incoming.ageUsage.length ? incoming.ageUsage : existing.ageUsage,
    minAgeYears: incoming.minAgeYears ?? existing.minAgeYears,
    ingredients: pickRicherText(existing.ingredients, incoming.ingredients),
    allergenTags: incoming.allergenTags.length ? incoming.allergenTags : existing.allergenTags,
    aliases: mergeAliasLists(existing, incoming, name),
    source: pickRicherSource(existing.source, incoming.source),
    confidence: pickRicherConfidence(existing.confidence, incoming.confidence),
  };
}

/**
 * Apply a catalog suggestion to the current diary section.
 * «Лекарство» prefills dose/form/INN; АСИТ and «Терапия» only fill the name
 * (and therapy dose when the user has not typed one).
 */
export function applyMedicineCardToSectionAnswers(
  sectionType: string,
  current: Record<string, string>,
  card: MedicineCard,
  ageYears: number | null,
  drugIntolerances: string[] = [],
): Record<string, string> {
  if (sectionType === 'Лекарство') {
    return mergeMedicinePrefillFromCard(current, card, ageYears, drugIntolerances, 'replace');
  }
  if (sectionType === 'АСИТ') {
    return { ...current, asitDrug: card.name.trim() };
  }
  if (sectionType === 'Терапия') {
    const next = { ...current, therapyDrug: card.name.trim() };
    if (!next.therapyDosage?.trim()) {
      const age = resolveMedicineAgeUsage(card, ageYears);
      if (age.dose) next.therapyDosage = age.dose;
    }
    return next;
  }
  return current;
}

/** Rebuild a catalog card from a saved / in-progress «Лекарство» answer set. */
export function buildMedicineCardFromDiaryAnswers(
  answers: Record<string, string>,
): MedicineCard | null {
  const name = answers.medicine?.trim() ?? '';
  if (!name) return null;

  const source = answers.medicineSource?.trim();
  const knownSource: MedicineSource =
    source === 'catalog' || source === 'vision' || source === 'ocr' || source === 'manual'
      ? source
      : 'manual';

  const hasDetails = Boolean(
    answers.dosage?.trim() ||
      answers.medicineForm?.trim() ||
      answers.medicineActiveSubstance?.trim() ||
      answers.medicineUsage?.trim(),
  );

  return toMedicineCard(
    {
      name,
      strength: answers.dosage,
      form: answers.medicineForm,
      activeSubstance: answers.medicineActiveSubstance,
      indications: answers.medicineUsage,
      confidence: hasDetails ? 'medium' : 'low',
    },
    knownSource,
  );
}

export function formatMedicineSuggestionMeta(card: MedicineCard): string {
  return [card.activeSubstance, card.form, card.strength]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ');
}

function cardSearchKeys(card: MedicineCard): { names: string[]; substance: string } {
  const names = [
    normalizeMedicineName(card.name),
    ...normalizeMedicineAliases(card.aliases, card.name).map(normalizeMedicineName),
  ].filter(Boolean);
  return { names, substance: normalizeMedicineName(card.activeSubstance) };
}

function suggestionRank(queryNormalized: string, card: MedicineCard): number {
  const { names, substance } = cardSearchKeys(card);
  if (names.includes(queryNormalized)) return 0;
  if (names.some((name) => name.startsWith(queryNormalized))) return 1;
  if (substance.startsWith(queryNormalized)) return 2;
  if (names.some((name) => name.includes(queryNormalized))) return 3;
  if (substance.includes(queryNormalized)) return 4;
  return 5;
}

/** Prefix-first autocomplete list. Drops cards that do not contain the query. */
export function filterAndRankMedicineSuggestions(
  query: string,
  cards: MedicineCard[],
  limit = MEDICINE_SUGGESTION_LIMIT,
): MedicineCard[] {
  const normalized = normalizeMedicineName(query);
  if (normalized.length < MEDICINE_SUGGESTION_MIN_QUERY) return [];

  const unique = new Map<string, MedicineCard>();
  for (const card of cards) {
    const key = medicineCardKey(card);
    if (!key) continue;
    const previous = unique.get(key);
    unique.set(key, previous ? mergeMedicineCards(previous, card) : card);
  }

  return [...unique.values()]
    .map((card) => ({ card, rank: suggestionRank(normalized, card) }))
    .filter((item) => item.rank < 5)
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.card.name.localeCompare(right.card.name, 'ru');
    })
    .slice(0, limit)
    .map((item) => item.card);
}

/** Exact normalized match, otherwise a single unique prefix hit. */
export function pickMedicineSuggestionForTypedName(
  query: string,
  cards: MedicineCard[],
): MedicineCard | null {
  const ranked = filterAndRankMedicineSuggestions(query, cards, MEDICINE_SUGGESTION_LIMIT);
  if (ranked.length === 0) return null;

  const normalized = normalizeMedicineName(query);
  const exact = ranked.find((card) => medicineCardKey(card) === normalized);
  if (exact) return exact;
  return ranked.length === 1 ? ranked[0] : null;
}
