import {
  PRESCRIBED_THERAPY_ROUTE_LABELS,
  type AsitClinicalDiagnosis,
  type AsitRoute,
  type AsitScheduleStage,
  type PrescribedTherapyRoute,
  createEmptyAsitClinicalDiagnosis,
  normalizeScheduleLines,
  scheduleLinesToNotes,
} from '@allerguide/core';

export interface PrescriptionParseResult {
  drug: string;
  dosage: string;
  /** Empty when not detected — caller keeps existing prescribed-therapy route. */
  route: PrescribedTherapyRoute | '';
  /** Empty when not detected — caller keeps existing ASIT SLIT/SCIT route. */
  asitRoute: AsitRoute | '';
  scheduleStages: AsitScheduleStage[];
  /** One UI row per schedule line (from stages and/or free-text schema). */
  scheduleLines: string[];
  startDate: string;
  endDate: string;
  /** Free-text schedule / regimen (joined scheduleLines). */
  scheduleNotes: string;
  notes: string;
  clinicalDiagnosis: AsitClinicalDiagnosis;
  source: 'demo' | 'text' | 'llm';
  warnings: string[];
}

const DEMO_PRESCRIPTION_TEXT =
  'Клинический диагноз\n' +
  'Основное заболевание: Аллергический ринит, сенсибилизация к пыльце берёзы\n' +
  'Сопутствующее заболевание: Атопический дерматит, ремиссия\n' +
  'Рекомендации: Избегать контакта с пыльцой в сезон; промывание носа\n' +
  'Диета: Ограничить сырые яблоки и орехи при оральном синдроме\n' +
  'План обследования: Специфические IgE к берёзе через 6 мес.; спирометрия\n' +
  'Другое: Обучение технике применения препарата\n' +
  'Препарат: Сталораль Берёза\n' +
  'Дозировка: 2 нажатия\n' +
  'Путь введения: Подъязычная (SLIT)\n' +
  'Дата начала: 2026-03-01\n' +
  'Дата окончания: 2026-08-31\n' +
  'Схема приёма:\n' +
  '1. Дни 1–3: 1 нажатие ежедневно\n' +
  '2. Дни 4–7: 2 нажатия ежедневно\n' +
  'Этап 1 (2026-03-01 – 2026-03-31): наращивание дозы\n' +
  'Этап 2 (2026-04-01 – 2026-08-31): поддерживающая доза\n' +
  'Заметки: Не разжёвывать.';

const ROUTE_ALIASES: Array<{ route: PrescribedTherapyRoute; patterns: RegExp[] }> = [
  { route: 'oral', patterns: [/пероральн/i, /\boral\b/i, /внутрь/i, /таблетк/i] },
  { route: 'inhaled', patterns: [/ингаляционн/i, /\binhal/i, /ингалятор/i] },
  { route: 'nasal', patterns: [/интраназальн/i, /назальн/i, /\bnasal\b/i] },
  { route: 'topical', patterns: [/местн/i, /наружн/i, /\btopic/i, /наружно/i] },
  { route: 'injection', patterns: [/инъекционн/i, /инъекц/i, /укол/i, /\binject/i] },
  { route: 'other', patterns: [/друг(ой|ое)/i, /\bother\b/i] },
];

const CLINICAL_SECTION_LABELS: Array<{
  key: keyof AsitClinicalDiagnosis;
  labels: string[];
}> = [
  {
    key: 'primaryDisease',
    labels: [
      'Основное заболевание',
      'Основной диагноз',
      'Primary disease',
      'Primary diagnosis',
    ],
  },
  {
    key: 'concomitantDisease',
    labels: [
      'Сопутствующее заболевание',
      'Сопутствующие заболевания',
      'Сопутствующий диагноз',
      'Сопутствующие диагнозы',
      'Concomitant',
      'Comorbidit',
    ],
  },
  {
    key: 'recommendations',
    labels: ['Рекомендации', 'Recommendations', 'Advice'],
  },
  {
    key: 'diet',
    labels: ['Диета', 'Питание', 'Diet', 'Nutrition'],
  },
  {
    key: 'examPlan',
    labels: [
      'План обследования',
      'Обследование',
      'План обследования и лечения',
      'Examination plan',
      'Workup',
    ],
  },
  {
    key: 'other',
    labels: ['Другое', 'Прочее', 'Дополнительно', 'Other', 'Additional'],
  },
];

const ALL_SECTION_STOP_LABELS = [
  ...CLINICAL_SECTION_LABELS.flatMap((s) => s.labels),
  'Клинический диагноз',
  'Clinical diagnosis',
  'Препарат',
  'Drug',
  'Наименование',
  'Название',
  'Дозировка',
  'Dosage',
  'Доза',
  'Dose',
  'Путь введения',
  'Способ введения',
  'Route',
  'Дата начала',
  'Дата окончания',
  'Схема приёма',
  'Схема приема',
  'Схема',
  'Режим приёма',
  'Режим приема',
  'Schedule',
  'Regimen',
  'Этап',
  'Заметки',
  'Notes',
  'Примечание',
  'Комментарий',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

function normalizeDateToken(raw: string): string {
  return extractDateFromSnippet(raw.trim()) || raw.trim();
}

/**
 * Parses stage lines: "Этап N (DATE – DATE): DOSE" with ISO or dotted dates.
 */
function parseScheduleStages(text: string): AsitScheduleStage[] {
  const stages: AsitScheduleStage[] = [];
  const stagePattern =
    /(?:этап\s*\d+\s*)?\(?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4})\s*[–\-—]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4})\s*\)?\s*:?\s*(.+)/gi;
  let match: RegExpExecArray | null;
  while ((match = stagePattern.exec(text)) !== null) {
    const from = normalizeDateToken(match[1]!);
    const to = normalizeDateToken(match[2]!);
    const dose = match[3]!.trim().replace(/^этап\s*\d+\s*:?\s*/i, '');
    if (!from || !to || !dose) continue;
    // Skip lines that are clearly not stages (too short / look like headers)
    if (dose.length < 2) continue;
    stages.push({ from, to, dose });
  }
  return stages;
}

function extractField(text: string, labels: string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${escapeRegExp(label)}\\s*:?\\s*(.+)`, 'i');
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

function stopLabelPattern(): string {
  return ALL_SECTION_STOP_LABELS.map(escapeRegExp).join('|');
}

/**
 * Multi-line block after a label until the next known section header.
 */
function extractSection(text: string, labels: string[]): string {
  const stop = stopLabelPattern();
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${escapeRegExp(label)}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:${stop})\\s*:|$)`,
      'i',
    );
    const match = text.match(pattern);
    const body = match?.[1]?.trim();
    if (body) return body.replace(/\n{3,}/g, '\n\n').trim();
  }
  return '';
}

function parseClinicalDiagnosis(text: string): AsitClinicalDiagnosis {
  const result = createEmptyAsitClinicalDiagnosis();
  for (const section of CLINICAL_SECTION_LABELS) {
    result[section.key] = extractSection(text, section.labels);
  }
  return result;
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

function parseAsitRoute(text: string): AsitRoute | '' {
  const labeled = extractField(text, [
    'Путь введения',
    'Способ введения',
    'Route',
    'Route of administration',
  ]);
  const haystack = `${labeled}\n${text}`;
  if (/подъязыч|sublingual|\bslit\b/i.test(haystack)) return 'slit';
  if (/подкожн|subcutaneous|\bscit\b/i.test(haystack)) return 'scit';
  return '';
}

function extractScheduleBulletLines(text: string): string[] {
  const section = extractSection(text, [
    'Схема приёма',
    'Схема приема',
    'Схема',
    'Режим приёма',
    'Режим приема',
    'Schedule',
    'Regimen',
  ]);
  if (!section) return [];

  const lines = section
    .split(/\n/)
    .map((line) => line.replace(/^\s*[-•*]+\s*/, '').replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  // Single-line section without bullets → one row
  if (lines.length === 0 && section.trim()) return [section.trim()];
  return lines;
}

function buildScheduleLines(
  stages: AsitScheduleStage[],
  scheduleNotesLine: string,
  bulletLines: string[],
): string[] {
  const lines: string[] = [];

  for (const stage of stages) {
    lines.push(`${stage.from} – ${stage.to}: ${stage.dose}`);
  }

  for (const bullet of bulletLines) {
    if (!lines.some((existing) => existing.toLowerCase() === bullet.toLowerCase())) {
      lines.push(bullet);
    }
  }

  if (scheduleNotesLine.trim()) {
    const parts = scheduleNotesLine
      .split(/\n|;|•/)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (!lines.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
        lines.push(part);
      }
    }
  }

  return normalizeScheduleLines(lines);
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
  const asitRoute = parseAsitRoute(normalized);
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
  const scheduleNotesLine = extractField(normalized, [
    'Схема приёма',
    'Схема приема',
    'Схема',
    'Режим приёма',
    'Режим приема',
    'Schedule',
    'Regimen',
  ]);
  const scheduleStages = parseScheduleStages(normalized);
  const bulletLines = extractScheduleBulletLines(normalized);
  const scheduleLines = buildScheduleLines(scheduleStages, scheduleNotesLine, bulletLines);
  const scheduleNotes = scheduleLinesToNotes(scheduleLines) || scheduleNotesLine;
  const notes = extractField(normalized, ['Заметки', 'Notes', 'Примечание', 'Комментарий']);
  const clinicalDiagnosis = parseClinicalDiagnosis(normalized);

  if (!drug) warnings.push('Препарат не распознан — укажите вручную.');
  if (!dosage) warnings.push('Дозировка не распознана — укажите вручную.');
  if (!route && !asitRoute) warnings.push('Путь введения не распознан — выберите вручную.');
  if (!startDate) warnings.push('Дата начала не распознана — выберите вручную.');
  if (!endDate) warnings.push('Дата окончания не распознана — выберите вручную.');
  if (scheduleLines.every((line) => !line.trim()) && scheduleStages.length === 0) {
    warnings.push('Схема приёма не найдена — проверьте текст назначения.');
  }

  return {
    drug,
    dosage,
    route,
    asitRoute,
    scheduleStages,
    scheduleLines,
    startDate,
    endDate,
    scheduleNotes,
    notes,
    clinicalDiagnosis,
    source: 'text',
    warnings,
  };
}

export function getDemoPrescriptionParse(): PrescriptionParseResult {
  return {
    ...parsePrescriptionText(DEMO_PRESCRIPTION_TEXT),
    source: 'demo',
    warnings: ['Демо-режим: замените препарат и этапы данными вашего назначения.'],
  };
}

export async function parsePrescriptionWithLlm(
  _text: string,
  _apiEnabled: boolean,
): Promise<PrescriptionParseResult> {
  return getDemoPrescriptionParse();
}

/**
 * Merge OCR parse into an existing prescribed-therapy draft.
 * Non-empty parsed fields overwrite the corresponding draft values.
 */
export function applyPrescriptionParseToCourse<T extends {
  drug: string;
  dosage: string;
  route: PrescribedTherapyRoute;
  startDate: string;
  endDate: string;
  scheduleNotes: string;
  scheduleLines?: string[];
  notes: string;
  stages?: AsitScheduleStage[];
}>(course: T, parsed: PrescriptionParseResult): T {
  const next: T = { ...course };

  if (parsed.drug) next.drug = parsed.drug;
  if (parsed.dosage) next.dosage = parsed.dosage;
  if (parsed.route) next.route = parsed.route;
  if (parsed.startDate) next.startDate = parsed.startDate;
  if (parsed.endDate) next.endDate = parsed.endDate;
  if (parsed.scheduleLines.some((line) => line.trim())) {
    next.scheduleLines = normalizeScheduleLines(parsed.scheduleLines);
    next.scheduleNotes = scheduleLinesToNotes(next.scheduleLines);
  } else if (parsed.scheduleNotes) {
    next.scheduleNotes = parsed.scheduleNotes;
    next.scheduleLines = normalizeScheduleLines(undefined, parsed.scheduleNotes);
  } else if (parsed.notes && !course.scheduleNotes.trim()) {
    next.scheduleNotes = parsed.notes;
    next.scheduleLines = normalizeScheduleLines(undefined, parsed.notes);
  }
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
 * Merge OCR parse into an ASIT course draft (incl. clinical diagnosis).
 * Maps SLIT/SCIT when detected; does not map oral/inhaled onto ASIT routes.
 */
export function applyPrescriptionParseToAsitCourse<T extends {
  drug: string;
  dosage?: string;
  route: AsitRoute;
  startDate: string;
  endDate?: string;
  scheduleNotes: string;
  scheduleLines?: string[];
  scheduleStages?: AsitScheduleStage[];
  clinicalDiagnosis?: AsitClinicalDiagnosis;
}>(course: T, parsed: PrescriptionParseResult): T {
  const next: T = { ...course };

  if (parsed.drug) next.drug = parsed.drug;
  if (parsed.dosage) next.dosage = parsed.dosage;
  if (parsed.asitRoute) next.route = parsed.asitRoute;
  if (parsed.startDate) next.startDate = parsed.startDate;
  if (parsed.endDate) next.endDate = parsed.endDate;

  if (parsed.scheduleLines.some((line) => line.trim())) {
    next.scheduleLines = normalizeScheduleLines(parsed.scheduleLines);
    next.scheduleNotes = scheduleLinesToNotes(next.scheduleLines);
  } else if (parsed.scheduleNotes) {
    next.scheduleNotes = parsed.scheduleNotes;
    next.scheduleLines = normalizeScheduleLines(undefined, parsed.scheduleNotes);
  } else if (parsed.notes && !course.scheduleNotes.trim()) {
    next.scheduleNotes = parsed.notes;
    next.scheduleLines = normalizeScheduleLines(undefined, parsed.notes);
  } else if (parsed.dosage && !course.scheduleNotes.trim()) {
    next.scheduleNotes = parsed.dosage;
    next.scheduleLines = normalizeScheduleLines(undefined, parsed.dosage);
  }

  if (parsed.scheduleStages.length > 0) {
    next.scheduleStages = parsed.scheduleStages.map((s) => ({
      from: s.from,
      to: s.to,
      dose: s.dose,
    }));
  }

  const diagnosis = parsed.clinicalDiagnosis;
  const hasDiagnosis = Object.values(diagnosis).some((value) => value.trim());
  if (hasDiagnosis) {
    const merged: AsitClinicalDiagnosis = {
      ...createEmptyAsitClinicalDiagnosis(),
      ...(course.clinicalDiagnosis ?? {}),
    };
    if (diagnosis.primaryDisease) merged.primaryDisease = diagnosis.primaryDisease;
    if (diagnosis.concomitantDisease) merged.concomitantDisease = diagnosis.concomitantDisease;
    if (diagnosis.recommendations) merged.recommendations = diagnosis.recommendations;
    if (diagnosis.diet) merged.diet = diagnosis.diet;
    if (diagnosis.examPlan) merged.examPlan = diagnosis.examPlan;
    if (diagnosis.other) merged.other = diagnosis.other;
    next.clinicalDiagnosis = merged;
  }

  return next;
}
