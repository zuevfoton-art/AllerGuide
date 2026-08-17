/**
 * Domain helpers for medicine-package vision:
 * image → structured medicine card JSON.
 * HTTP / providers live in apps/api; this module stays provider-agnostic.
 */

export type MedicineVisionConfidence = 'low' | 'medium' | 'high';

export interface MedicineVisionAgeUsage {
  minAgeYears?: number;
  maxAgeYears?: number;
  dose?: string;
  note?: string;
}

export interface MedicineVisionResult {
  name: string;
  activeSubstance: string;
  form: string;
  strength: string;
  manufacturer: string;
  indications: string;
  ageUsage: MedicineVisionAgeUsage[];
  minAgeYears: number | null;
  ingredients: string;
  allergenTags: string[];
  confidence: MedicineVisionConfidence;
  notes?: string;
}

const MEDICINE_VISION_SYSTEM = [
  'You read a medicine package, blister, or leaflet photo for allergy screening.',
  'Extract only what is visible or clearly implied by the package. Do not invent a dose.',
  'Reply with a single JSON object only. No markdown fences, no commentary.',
].join(' ');

export function medicineVisionSystemInstruction(): string {
  return MEDICINE_VISION_SYSTEM;
}

export function buildMedicineVisionPrompt(localeHint = 'ru', ageYears?: number | null): string {
  const ageLine =
    ageYears == null
      ? '- Возраст пациента неизвестен — не подбирай персональную дозу.'
      : `- Возраст пациента: ${ageYears} лет. Если на упаковке есть возрастные ограничения, укажи их в minAgeYears / ageUsage.`;

  return [
    'Распознай лекарство на фото упаковки или блистера.',
    'Ответь ТОЛЬКО JSON без markdown:',
    '{"name":"…","activeSubstance":"…","form":"…","strength":"…","manufacturer":"…","indications":"…","ageUsage":[{"minAgeYears":0,"maxAgeYears":99,"dose":"…","note":"…"}],"minAgeYears":null,"ingredients":"…","allergenTags":["…"],"confidence":"low|medium|high","notes":"…"}',
    'Правила:',
    '- name — торговое название, как на упаковке.',
    '- activeSubstance — МНН / действующее вещество.',
    '- form — таблетки, сироп, спрей, капли и т.п.',
    '- strength — дозировка с упаковки (например «200 мг»), не схема приёма.',
    '- indications — краткое применение с упаковки/листка, справочно.',
    '- allergenTags — вспомогательные вещества-аллергены (лактоза, желатин и т.п.), если видны.',
    '- Если это не лекарство — name:"", confidence:"low".',
    ageLine,
    `- Язык текстовых полей: ${localeHint}.`,
  ].join('\n');
}

function asConfidence(value: unknown): MedicineVisionConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseAgeUsage(raw: unknown): MedicineVisionAgeUsage[] {
  if (!Array.isArray(raw)) return [];
  const bands: MedicineVisionAgeUsage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const band: MedicineVisionAgeUsage = {};
    const minAgeYears = asOptionalNumber(row.minAgeYears);
    const maxAgeYears = asOptionalNumber(row.maxAgeYears);
    if (minAgeYears != null) band.minAgeYears = minAgeYears;
    if (maxAgeYears != null) band.maxAgeYears = maxAgeYears;
    if (typeof row.dose === 'string' && row.dose.trim()) band.dose = row.dose.trim();
    if (typeof row.note === 'string' && row.note.trim()) band.note = row.note.trim();
    if (Object.keys(band).length) bands.push(band);
  }
  return bands;
}

function parseStringList(raw: unknown, limit: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, limit);
}

/** Parse model JSON into a normalized medicine vision result, or null if unusable. */
export function parseMedicineVisionResponse(raw: string): MedicineVisionResult | null {
  if (!raw?.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(raw));
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const activeSubstance = typeof obj.activeSubstance === 'string' ? obj.activeSubstance.trim() : '';
  if (!name && !activeSubstance) return null;

  const minAgeYears = asOptionalNumber(obj.minAgeYears) ?? null;

  return {
    name: name || activeSubstance,
    activeSubstance,
    form: typeof obj.form === 'string' ? obj.form.trim() : '',
    strength: typeof obj.strength === 'string' ? obj.strength.trim() : '',
    manufacturer: typeof obj.manufacturer === 'string' ? obj.manufacturer.trim() : '',
    indications: typeof obj.indications === 'string' ? obj.indications.trim() : '',
    ageUsage: parseAgeUsage(obj.ageUsage),
    minAgeYears,
    ingredients: typeof obj.ingredients === 'string' ? obj.ingredients.trim() : '',
    allergenTags: parseStringList(obj.allergenTags, 16),
    confidence: asConfidence(obj.confidence),
    ...(typeof obj.notes === 'string' && obj.notes.trim() ? { notes: obj.notes.trim() } : {}),
  };
}
