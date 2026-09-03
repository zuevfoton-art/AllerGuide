import { formatScaleSummary } from './clinical-scales';
import { enrichSeverityAnswers, formatSeveritySummary, normalizeSeverity } from './diary-severity';
import { enrichSymptomAnswers, enrichFoodAnswers, formatCodedSymptomsSummary, resolveSymptomCodes } from './symptom-coding';
import { formatAsitSummary } from './asit-therapy';
import { formatFoodEntrySummary, formatMedicineEntrySummary } from './food-drug-allergy';
import { formatInsectStingEntrySummary } from './insect-allergy';
import { buildPrescribedTherapyDiarySummary } from './prescribed-therapy';
import {
  DIARY_AUTO_STEP_IDS,
  DIARY_PHOTO_ANSWER_IDS,
  type DiarySection,
  type StructuredDiaryPayload,
  getDiarySection,
} from './diary-schema';

export function parseDiaryPhotoUris(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function serializeDiaryPhotoUris(uris: string[]): string {
  return JSON.stringify(uris.slice(0, 5));
}

export function getDiaryPhotoUrisFromAnswers(answers: Record<string, string>): string[] {
  const uris: string[] = [];
  for (const key of DIARY_PHOTO_ANSWER_IDS) {
    for (const uri of parseDiaryPhotoUris(answers[key])) {
      if (!uris.includes(uri)) uris.push(uri);
    }
  }
  return uris;
}

/** Remove photo payloads from answers so summaries / PDF text stay clean. */
export function stripDiaryPhotoAnswers(answers: Record<string, string>): Record<string, string> {
  const next = { ...answers };
  for (const key of DIARY_PHOTO_ANSWER_IDS) {
    delete next[key];
  }
  return next;
}

export function encodeDiaryDetails(answers: Record<string, string>, sectionType?: string): string {
  let enriched = stripDiaryPhotoAnswers({ ...answers });
  if (sectionType === 'Симптомы') {
    enriched = enrichSymptomAnswers(enriched);
    enriched = enrichSeverityAnswers(enriched, 'Симптомы');
  } else if (sectionType === 'Питание') {
    enriched = enrichFoodAnswers(enriched);
    enriched = enrichSeverityAnswers(enriched, sectionType);
  } else if (sectionType) {
    enriched = enrichSeverityAnswers(enriched, sectionType);
  }
  const payload: StructuredDiaryPayload = { v: 1, answers: enriched };
  return JSON.stringify(payload);
}

export function enrichDiaryAnswers(
  sectionType: string,
  answers: Record<string, string>,
): Record<string, string> {
  if (sectionType === 'Симптомы') {
    return enrichSeverityAnswers(enrichSymptomAnswers(answers), 'Симптомы');
  }
  if (sectionType === 'Питание') {
    return enrichSeverityAnswers(enrichFoodAnswers(answers), sectionType);
  }
  return enrichSeverityAnswers(answers, sectionType);
}

export function decodeDiaryDetails(details: string): StructuredDiaryPayload | null {
  try {
    const parsed = JSON.parse(details) as StructuredDiaryPayload;
    if (parsed?.v === 1 && parsed.answers && typeof parsed.answers === 'object') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function formatDiaryEntrySummary(type: string, details: string): string {
  const structured = decodeDiaryDetails(details);
  if (!structured) return details.trim() || 'Без описания';

  if (type === 'Шкала') {
    return formatScaleSummary(structured.answers);
  }

  if (type === 'АСИТ') {
    return formatAsitSummary(structured.answers);
  }

  if (type === 'Терапия') {
    return buildPrescribedTherapyDiarySummary(structured.answers);
  }

  if (type === 'Питание') {
    return formatFoodEntrySummary(structured.answers);
  }

  if (type === 'Лекарство') {
    return formatMedicineEntrySummary(structured.answers);
  }

  if (type === 'Укус насекомого') {
    return formatInsectStingEntrySummary(structured.answers);
  }

  if (type === 'Симптомы') {
    const parts: string[] = [];
    const symptoms = structured.answers.symptoms?.trim();
    if (symptoms) parts.push(symptoms);
    const severity = normalizeSeverity(structured.answers, 'Симптомы');
    if (severity !== null) parts.push(`тяжесть ${formatSeveritySummary(severity)}`);
    const coded = formatCodedSymptomsSummary(
      resolveSymptomCodes(structured.answers, { inferFromText: false }),
    );
    if (coded) parts.push(coded);
    return parts.length ? parts.join(' · ') : 'Симптомы';
  }

  const section = getDiarySection(type);
  if (!section) {
    return Object.values(structured.answers)
      .filter(Boolean)
      .join(' · ');
  }

  return section.steps
    .map((step) => {
      if (step.field === 'photo') return null;
      if (DIARY_AUTO_STEP_IDS.has(step.id)) return null;
      const value = structured.answers[step.id]?.trim();
      if (!value) return null;
      return `${step.label}: ${value}`;
    })
    .filter(Boolean)
    .join(' · ');
}

export function validateDiarySection(
  section: DiarySection,
  answers: Record<string, string>,
): string | null {
  for (let i = 0; i < section.steps.length; i++) {
    const err = validateDiarySectionStep(section, i, answers);
    if (err) return err;
  }

  if (section.type === 'Симптомы') {
    const hasSeverity =
      answers.severity0_3?.trim() || answers.intensity?.trim() || answers.severity?.trim();
    if (!hasSeverity) return 'Укажите выраженность симптомов (0–3).';
  }

  return null;
}

export function validateDiarySectionStep(
  section: DiarySection,
  stepIndex: number,
  answers: Record<string, string>,
): string | null {
  const step = section.steps[stepIndex];
  if (!step?.required) return null;
  const value = answers[step.id]?.trim();
  if (!value) return `Заполните поле «${step.label}».`;
  return null;
}

const MONTHS_SHORT_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDiaryDate(iso: string, reference = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const time = `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
  const dayDiff = Math.round(
    (startOfDay(reference).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return `Сегодня, ${time}`;
  if (dayDiff === 1) return `Вчера, ${time}`;

  const day = date.getDate();
  const month = MONTHS_SHORT_RU[date.getMonth()];
  if (date.getFullYear() === reference.getFullYear()) {
    return `${day} ${month}, ${time}`;
  }

  return `${day} ${month} ${date.getFullYear()}, ${time}`;
}

export function getDiaryEntryAnswers(type: string, details: string): Record<string, string> | null {
  const structured = decodeDiaryDetails(details);
  if (structured) return structured.answers;

  const trimmed = details.trim();
  if (!trimmed) return null;

  const section = getDiarySection(type);
  if (section?.type === 'Заметка') {
    return { noteBody: trimmed };
  }

  return null;
}
