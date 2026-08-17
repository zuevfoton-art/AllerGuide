import { extractIngredientsBlock, normalizeOcrText } from './ocr';
import type { MedicineVisionResult } from './medicine-vision';

const TRADE_NAME_HEADERS = [
  /(?:препарат|торговое\s+название|название)[:\s]+(.+)/i,
  /(?:trade\s+name|brand)[:\s]+(.+)/i,
];
const SUBSTANCE_HEADERS = [
  /действующ(?:ее|ее)\s+вещество[:\s]+(.+)/i,
  /active\s+substance[:\s]+(.+)/i,
  /мнн[:\s]+(.+)/i,
];
const FORM_HEADERS = [/(?:форма\s+выпуска|лекарственная\s+форма)[:\s]+(.+)/i, /(?:dosage\s+form)[:\s]+(.+)/i];
const STRENGTH_PATTERN = /(\d+(?:[.,]\d+)?\s*(?:мг|г|мл|me|ме|%))/i;
const FORM_WORDS = /(таблетк|сироп|капсул|спрей|капли|мазь|гель|суспенз|раствор|порошок)/i;

function firstLineMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value.split(/[.;\n]/)[0]?.trim() ?? value;
  }
  return '';
}

function inferName(text: string): string {
  const labeled = firstLineMatch(text, TRADE_NAME_HEADERS);
  if (labeled) return labeled;
  const firstLine = text.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  if (!firstLine) return '';
  if (/действующ|состав|вспомогательн|active\s+substance/i.test(firstLine)) return '';
  return firstLine.split(/[.,;]/)[0]?.trim() ?? firstLine;
}

function inferStrength(text: string): string {
  const match = text.match(STRENGTH_PATTERN);
  return match?.[1]?.replace(',', '.').trim() ?? '';
}

function inferForm(text: string): string {
  const labeled = firstLineMatch(text, FORM_HEADERS);
  if (labeled) return labeled;
  const match = text.match(FORM_WORDS);
  if (!match) return '';
  const word = match[0].toLowerCase();
  if (word.startsWith('таблет')) return 'таблетки';
  if (word.startsWith('капсул')) return 'капсулы';
  if (word.startsWith('сироп')) return 'сироп';
  if (word.startsWith('спрей')) return 'спрей';
  if (word.startsWith('капл')) return 'капли';
  if (word.startsWith('мазь')) return 'мазь';
  if (word.startsWith('гель')) return 'гель';
  if (word.startsWith('суспенз')) return 'суспензия';
  if (word.startsWith('раствор')) return 'раствор';
  if (word.startsWith('порошок')) return 'порошок';
  return word;
}

/**
 * Offline / flag-off parse of a medicine package OCR dump.
 * Returns null when neither a trade name nor an active substance can be found.
 */
export function parseMedicineLabelText(text: string): MedicineVisionResult | null {
  const normalized = normalizeOcrText(text);
  if (!normalized) return null;

  const name = inferName(normalized);
  const activeSubstance = firstLineMatch(normalized, SUBSTANCE_HEADERS);
  const strength = inferStrength(normalized);
  const form = inferForm(normalized);
  const hasMedicineSignal = Boolean(activeSubstance || strength || form || firstLineMatch(normalized, TRADE_NAME_HEADERS));
  if (!hasMedicineSignal) return null;
  if (!name && !activeSubstance) return null;

  const ingredients = extractIngredientsBlock(normalized) ?? '';

  return {
    name: name || activeSubstance,
    activeSubstance,
    form,
    strength,
    manufacturer: '',
    indications: '',
    ageUsage: [],
    minAgeYears: null,
    ingredients,
    allergenTags: [],
    confidence: name && activeSubstance ? 'medium' : 'low',
  };
}

export function getDemoMedicineLabelText(): string {
  return [
    'Нурофен',
    'Действующее вещество: ибупрофен 200 мг.',
    'Форма выпуска: таблетки, покрытые оболочкой.',
    'Состав: ибупрофен, лактоза, крахмал, магния стеарат.',
  ].join('\n');
}
