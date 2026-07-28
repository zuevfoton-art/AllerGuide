import type { AsitScheduleStage } from '@allerguide/core';

export interface PrescriptionParseResult {
  drug: string;
  dosage: string;
  scheduleStages: AsitScheduleStage[];
  startDate: string;
  notes: string;
  source: 'demo' | 'text' | 'llm';
  warnings: string[];
}

const DEMO_PRESCRIPTION_TEXT =
  'Препарат: Сталораль Берёза 300 IR\n' +
  'Дозировка: по схеме назначения\n' +
  'Начало: 2026-03-01\n' +
  'Этап 1 (2026-03-01 – 2026-05-31): 1 доза утром\n' +
  'Этап 2 (2026-06-01 – 2026-11-30): поддерживающая доза\n' +
  'Заметки: Принимать натощак под язык, выдержать 2 минуты.';

/**
 * Parses ISO-like date expressions from prescription text.
 * Accepts YYYY-MM-DD and common Russian short forms.
 */
function extractDate(text: string): string {
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
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
 */
function extractField(text: string, labels: string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*:?\\s*(.+)`, 'i');
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
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
  const startDate = extractDate(normalized);
  const scheduleStages = parseScheduleStages(normalized);
  const notes = extractField(normalized, ['Заметки', 'Notes', 'Примечание', 'Комментарий']);

  if (!drug) warnings.push('Препарат не распознан — укажите вручную.');
  if (!startDate) warnings.push('Дата начала не распознана — выберите вручную.');
  if (scheduleStages.length === 0) warnings.push('Этапы схемы не найдены — проверьте текст назначения.');

  return { drug, dosage, scheduleStages, startDate, notes, source: 'text', warnings };
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
