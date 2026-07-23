import { SEVERITY_0_3_CHOICES, type Severity0_3 } from './diary-severity';
import {
  getSymptomConcept,
  inferSymptomCodesFromText,
  SYMPTOM_CATALOG,
} from './symptom-coding';

/** Result of parsing a free-form voice utterance for diary fields. */
export type VoiceDiaryParseResult = {
  /** Raw transcript (trimmed). */
  transcript: string;
  /** Free-text symptoms field. */
  symptoms?: string;
  /** Catalog choice label for symptomCode step. */
  symptomCode?: string;
  /** Canonical choice string for severity0_3. */
  severity0_3?: string;
  /** Onset free text if detected. */
  onset?: string;
  /** Symptom area choice if detected. */
  symptomAreas?: string;
};

const AREA_PATTERNS: Array<{ area: string; patterns: RegExp[] }> = [
  { area: 'Нос', patterns: [/нос/, /насморк/, /чих/] },
  { area: 'Глаза', patterns: [/глаз/, /конъюнктив/, /слез/] },
  { area: 'Дыхание', patterns: [/дых/, /кашел/, /одыш/, /свист/, /астм/, /груд/] },
  { area: 'Кожа', patterns: [/кож/, /сып/, /крапив/, /зуд(?!\s*глаз)/, /волдыр/, /от[её]к/] },
  { area: 'ЖКТ', patterns: [/живот/, /тошнот/, /рвот/, /понос/, /диар/, /жкт/] },
  { area: 'Общее', patterns: [/обморок/, /слаб/, /давлен/, /анафилакс/] },
];

const SEVERITY_PATTERNS: Array<{ severity: Severity0_3; patterns: RegExp[] }> = [
  { severity: 0, patterns: [/нет\s+симптом/, /без\s+симптом/, /вс[её]\s+норм/] },
  {
    severity: 1,
    patterns: [/л[её]гк/, /несильн/, /слаб(ый|ая|ое)\s+(зуд|кашел|прояв)/, /немного/, /чуть/],
  },
  { severity: 2, patterns: [/умеренн/, /средн(яя|ей|ий)/] },
  {
    severity: 3,
    patterns: [/сильн/, /тяж[её]л/, /очень\s+сильн/, /невыносим/, /анафилакс/],
  },
];

const ONSET_PATTERNS: Array<{ pattern: RegExp; format: (match: RegExpMatchArray) => string }> = [
  {
    pattern: /сегодня\s+утром/,
    format: () => 'сегодня утром',
  },
  {
    pattern: /сегодня\s+вечером/,
    format: () => 'сегодня вечером',
  },
  {
    pattern: /сегодня\s+днём|сегодня\s+днем/,
    format: () => 'сегодня днём',
  },
  {
    pattern: /вчера\s+вечером/,
    format: () => 'вчера вечером',
  },
  {
    pattern: /вчера/,
    format: () => 'вчера',
  },
  {
    pattern: /(\d+)\s*(час|часа|часов)\s+назад/,
    format: (m) => `${m[1]} ч назад`,
  },
  {
    pattern: /(\d+)\s*(минут|минуты|минуту)\s+назад/,
    format: (m) => `${m[1]} мин назад`,
  },
  {
    pattern: /около\s+часа\s+назад|час\s+назад/,
    format: () => 'около часа назад',
  },
  {
    pattern: /только\s+что|сейчас/,
    format: () => 'только что',
  },
];

/**
 * Appends a new transcript to existing field text with a line break when needed.
 */
export function appendTranscript(existing: string, transcript: string): string {
  const next = transcript.trim();
  if (!next) return existing;
  const prev = existing.trim();
  if (!prev) return next;
  return `${prev}\n${next}`;
}

/**
 * Maps app locale codes to BCP-47 tags for OS / Web Speech Recognition.
 */
export function resolveSpeechLocale(locale: string): string {
  const map: Record<string, string> = {
    ru: 'ru-RU',
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
  };
  const base = locale.split('-')[0]?.toLowerCase() ?? 'ru';
  return map[base] ?? 'ru-RU';
}

function detectSeverity(lower: string): Severity0_3 | null {
  for (const entry of SEVERITY_PATTERNS) {
    if (entry.patterns.some((re) => re.test(lower))) return entry.severity;
  }
  const numeric = lower.match(/выраженност[ьи]\s*(\d)|severity\s*(\d)|сил[ае]\s*(\d)/);
  if (numeric) {
    const n = Number(numeric[1] ?? numeric[2] ?? numeric[3]);
    if (n >= 0 && n <= 3) return n as Severity0_3;
  }
  return null;
}

function detectOnset(lower: string): string | undefined {
  for (const entry of ONSET_PATTERNS) {
    const match = lower.match(entry.pattern);
    if (match) return entry.format(match);
  }
  return undefined;
}

function detectArea(lower: string): string | undefined {
  for (const entry of AREA_PATTERNS) {
    if (entry.patterns.some((re) => re.test(lower))) return entry.area;
  }
  return undefined;
}

/**
 * Light parser for diary voice utterances (Phase C v2).
 * Preferentially fills symptoms / severity / onset / area from free text.
 */
export function parseVoiceDiaryUtterance(text: string): VoiceDiaryParseResult {
  const transcript = text.trim();
  if (!transcript) return { transcript: '' };

  const lower = transcript.toLowerCase().replace(/ё/g, 'е');
  const codes = inferSymptomCodesFromText(transcript);
  const primary = codes[0] ? getSymptomConcept(codes[0]) : undefined;

  const severity = detectSeverity(lower);
  const onset = detectOnset(lower);
  const symptomAreas = detectArea(lower);

  const result: VoiceDiaryParseResult = { transcript };

  if (codes.length || /симптом|зуд|кашел|от[её]к|насморк|чих|сып|одыш/.test(lower)) {
    result.symptoms = transcript;
  }
  if (primary) {
    result.symptomCode = primary.labelRu;
  }
  if (severity !== null) {
    result.severity0_3 = SEVERITY_0_3_CHOICES[severity];
  }
  if (onset) result.onset = onset;
  if (symptomAreas) result.symptomAreas = symptomAreas;

  return result;
}

/**
 * Merge a voice parse into diary section answers.
 * Fills empty structured fields; always appends transcript into `targetStepId` (default `symptoms`).
 */
export function applyVoiceParseToAnswers(
  answers: Record<string, string>,
  parsed: VoiceDiaryParseResult,
  options?: { targetStepId?: string; sectionType?: string },
): Record<string, string> {
  const targetStepId = options?.targetStepId ?? 'symptoms';
  const next = { ...answers };
  const transcript = parsed.transcript.trim();
  if (!transcript) return next;

  next[targetStepId] = appendTranscript(next[targetStepId] ?? '', transcript);

  if (options?.sectionType === 'Симптомы' || !options?.sectionType) {
    if (parsed.symptoms && targetStepId !== 'symptoms') {
      next.symptoms = appendTranscript(next.symptoms ?? '', parsed.symptoms);
    }
    if (parsed.symptomCode && !next.symptomCode?.trim()) {
      next.symptomCode = parsed.symptomCode;
    }
    if (parsed.severity0_3 && !next.severity0_3?.trim()) {
      next.severity0_3 = parsed.severity0_3;
    }
    if (parsed.onset && !next.onset?.trim()) {
      next.onset = parsed.onset;
    }
    if (parsed.symptomAreas && !next.symptomAreas?.trim()) {
      next.symptomAreas = parsed.symptomAreas;
    }
    if (parsed.symptomCode) {
      const id = SYMPTOM_CATALOG.find((item) => item.labelRu === parsed.symptomCode)?.id;
      if (id) {
        const existing = (next.symptomCodes ?? '')
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
        if (!existing.includes(id)) {
          next.symptomCodes = [...existing, id].join(',');
        }
      }
    }
  }

  return next;
}
