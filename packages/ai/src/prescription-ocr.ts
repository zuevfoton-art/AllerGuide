import {
  PRESCRIBED_THERAPY_ROUTE_LABELS,
  type AsitScheduleStage,
  type PrescribedTherapyRoute,
} from '@allerguide/core';

export interface PrescriptionParseResult {
  drug: string;
  dosage: string;
  /** Empty when not detected — caller keeps existing route. */
  route: PrescribedTherapyRoute | '';
  scheduleStages: AsitScheduleStage[];
  startDate: string;
  endDate: string;
  /** Free-text schedule / regimen (схема приёма). */
  scheduleNotes: string;
  notes: string;
  source: 'demo' | 'text' | 'llm';
  warnings: string[];
}

const DEMO_PRESCRIPTION_TEXT =
  'Препарат: Монтелукаст 10 мг\n' +
  'Дозировка: 1 таблетка вечером\n' +
  'Путь введения: Пероральный\n' +
  'Дата начала: 2026-03-01\n' +
  'Дата окончания: 2026-08-31\n' +
  'Схема приёма: 1 таблетка 1 раз в сутки перед сном\n' +
  'Этап 1 (2026-03-01 – 2026-05-31): 1 таблетка вечером\n' +
  'Этап 2 (2026-06-01 – 2026-08-31): поддерживающая доза\n' +
  'Заметки: Не разжёвывать.';

const ROUTE_ALIASES: Array<{ route: PrescribedTherapyRoute; patterns: RegExp[] }> = [
  { route: 'oral', patterns: [/пероральн/i, /\boral\b/i, /внутрь/i, /таблетк/i] },
  { route: 'inhaled', patterns: [/ингаляционн/i, /\binhal/i, /ингалятор/i] },
  { route: 'nasal', patterns: [/интраназальн/i, /назальн/i, /\bnasal\b/i] },
  { route: 'topical', patterns: [/местн/i, /наружн/i, /\btopic/i, /наружно/i] },
  { route: 'injection', patterns: [/инъекционн/i, /инъекц/i, /укол/i, /\binject/i] },
  { route: 'other', patterns: [/друг(ой|ое)/i, /\bother\b/i] },
];

/**
 * Parses ISO-like date expressions from a short snippet.
 * Accepts YYYY-MM-DD and DD.MM.YYYY / DD/MM/YYYY.
 */
function extractDateFromSnippet(text: string): string {
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;

  const dotted = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dotted) {
    const day = dotted[1]!.padStart(2, '0');
    const month = dotted[2]!.padStart(2, '0');
    const year = dotted[3]!;
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Parses stage lines of the form "(DATE – DATE): DOSE" or "Этап N (DATE – DATE): DOSE".
 */
function parseScheduleStages(text: string): AsitScheduleStage[] {
  const stages: AsitScheduleStage[] = [];
  const stagePattern =
    /(?:этап\s*\d+\s*)?\((\d{4}-\d{2}-\d{2})\s*[–\-]\s*(\d{4}-\d{2}-\d{2})\)\s*:?\s*(.+)/gi;
  let match: RegExpExecArray | null;
  while ((match = stagePattern.exec(text)) !== null) {
    stages.push({
      from: match[1]!,
      to: match[2]!,
      dose: match[3]!.trim(),
    });
  }
  return stages;
}

/**
 * Extracts a field value following a label like "Препарат:", "Drug:", etc.
 * Stops at end of line.
 */
function extractField(text: string, labels: string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*:?\\s*(.+)`, 'i');
    const match = text.match(pattern);
    if (match?.[1]) return match[1]!.trim();
  }
  return '';
}

function extractLabeledDate(text: string, labels: string[]): string {
  const value = extractField(text, labels);
  if (!value) return '';
  return extractDateFromSnippet(value);
}

function parseRoute(text: string): PrescribedTherapyRoute | '' {
  const labeled = extractField(text, [
    'Путь введения',
    'Способ введения',
    'Route',
    'Route of administration',
  ]);
  const haystack = labeled || text;

  for (const [route, label] of Object.entries(PRESCRIBED_THERAPY_ROUTE_LABELS) as Array<
    [PrescribedTherapyRoute, string]
  >) {
    if (haystack.toLowerCase().includes(label.toLowerCase())) return route;
  }

  for (const entry of ROUTE_ALIASES) {
    if (entry.patterns.some((pattern) => pattern.test(haystack))) return entry.route;
  }

  return '';
}

/**
 * Parse prescription text (from OCR or manual input) into structured fields.
 * Always returns a result; missing fields are empty strings with a warning.
 */
export function parsePrescriptionText(text: string): PrescriptionParseResult {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const warnings: string[] = [];

  const drug = extractField(normalized, ['Препарат', 'Drug', 'Наименование', 'Название']);
  const dosage = extractField(normalized, ['Дозировка', 'Dosage', 'Доза', 'Dose']);
  const route = parseRoute(normalized);
  const startDate =
    extractLabeledDate(normalized, ['Дата начала', 'Начало', 'Start date', 'Start']) ||
    extractDateFromSnippet(normalized);
  const endDate = extractLabeledDate(normalized, [
    'Дата окончания',
    'Окончание',
    'Конец',
    'End date',
    'End',
  ]);
  const scheduleNotes = extractField(normalized, [
    'Схема приёма',
    'Схема приема',
    'Схема',
    'Режим приёма',
    'Режим приема',
    'Schedule',
    'Regimen',
  ]);
  const scheduleStages = parseScheduleStages(normalized);
  const notes = extractField(normalized, ['Заметки', 'Notes', 'Примечание', 'Комментарий']);

  if (!drug) warnings.push('Препарат не распознан — укажите вручную.');
  if (!dosage) warnings.push('Дозировка не распознана — укажите вручную.');
  if (!route) warnings.push('Путь введения не распознан — выберите вручную.');
  if (!startDate) warnings.push('Дата начала не распознана — выберите вручную.');
  if (!endDate) warnings.push('Дата окончания не распознана — выберите вручную.');
  if (!scheduleNotes && scheduleStages.length === 0) {
    warnings.push('Схема приёма не найдена — проверьте текст назначения.');
  }

  return {
    drug,
    dosage,
    route,
    scheduleStages,
    startDate,
    endDate,
    scheduleNotes,
    notes,
    source: 'text',
    warnings,
  };
}

/**
 * Demo prescription parse result used when the AI feature flag is off or
 * no text is available. Safe to show to any user as an example.
 */
export function getDemoPrescriptionParse(): PrescriptionParseResult {
  return {
    ...parsePrescriptionText(DEMO_PRESCRIPTION_TEXT),
    source: 'demo',
    warnings: ['Демо-режим: замените препарат и этапы данными вашего назначения.'],
  };
}

/**
 * LLM stub — in production this would call the API scan route with a
 * structured prompt. Returns demo parse when AI is disabled.
 */
export async function parsePrescriptionWithLlm(
  _text: string,
  _apiEnabled: boolean,
): Promise<PrescriptionParseResult> {
  // AI calls go through apps/api; local fallback is always demo.
  return getDemoPrescriptionParse();
}

/**
 * Merge OCR parse into an existing course draft.
 * Non-empty parsed fields overwrite the corresponding draft values.
 */
export function applyPrescriptionParseToCourse<T extends {
  drug: string;
  dosage: string;
  route: PrescribedTherapyRoute;
  startDate: string;
  endDate: string;
  scheduleNotes: string;
  notes: string;
  stages?: AsitScheduleStage[];
}>(course: T, parsed: PrescriptionParseResult): T {
  const next: T = { ...course };

  if (parsed.drug) next.drug = parsed.drug;
  if (parsed.dosage) next.dosage = parsed.dosage;
  if (parsed.route) next.route = parsed.route;
  if (parsed.startDate) next.startDate = parsed.startDate;
  if (parsed.endDate) next.endDate = parsed.endDate;
  if (parsed.scheduleNotes) next.scheduleNotes = parsed.scheduleNotes;
  else if (parsed.notes && !course.scheduleNotes.trim()) next.scheduleNotes = parsed.notes;
  if (parsed.notes) next.notes = parsed.notes;
  if (parsed.scheduleStages.length > 0) {
    next.stages = parsed.scheduleStages.map((s) => ({
      from: s.from,
      to: s.to,
      dose: s.dose,
    }));
  }

  return next;
}

/**
 * Merge OCR parse into an ASIT course draft.
 * Does not map prescribed-therapy routes (oral/…) onto SLIT/SCIT.
 */
export function applyPrescriptionParseToAsitCourse<T extends {
  drug: string;
  startDate: string;
  scheduleNotes: string;
  scheduleStages?: AsitScheduleStage[];
}>(course: T, parsed: PrescriptionParseResult): T {
  const next: T = { ...course };

  if (parsed.drug) next.drug = parsed.drug;
  if (parsed.startDate) next.startDate = parsed.startDate;
  if (parsed.scheduleNotes) next.scheduleNotes = parsed.scheduleNotes;
  else if (parsed.notes && !course.scheduleNotes.trim()) next.scheduleNotes = parsed.notes;
  else if (parsed.dosage && !course.scheduleNotes.trim()) next.scheduleNotes = parsed.dosage;
  if (parsed.scheduleStages.length > 0) {
    next.scheduleStages = parsed.scheduleStages.map((s) => ({
      from: s.from,
      to: s.to,
      dose: s.dose,
    }));
  }

  return next;
}
