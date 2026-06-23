import type { DiarySection, DiaryStep } from './diary';

export type ClinicalScaleId = 'aria-lite' | 'act' | 'scorad-lite' | 'uas7';

export interface ClinicalScaleMeta {
  id: ClinicalScaleId;
  title: string;
  shortLabel: string;
  description: string;
}

export interface ScaleScoreResult {
  total: number;
  interpretation: string;
  level: 'good' | 'moderate' | 'severe' | 'uncontrolled';
}

export const CLINICAL_SCALES: ClinicalScaleMeta[] = [
  {
    id: 'aria-lite',
    title: 'ARIA-lite (ринит)',
    shortLabel: 'Ринит',
    description: '4 симптома по шкале 0–3. Сумма 0–12.',
  },
  {
    id: 'act',
    title: 'ACT (астма)',
    shortLabel: 'Астма',
    description: '5 вопросов по шкале 1–5. Сумма 5–25.',
  },
  {
    id: 'scorad-lite',
    title: 'SCORAD-lite (АтД)',
    shortLabel: 'Кожа',
    description: 'Площадь, зуд и сон — упрощённая оценка.',
  },
  {
    id: 'uas7',
    title: 'UAS7 (крапивница)',
    shortLabel: 'Крапивница',
    description: 'Дневная запись: сыпь и зуд.',
  },
];

const ARIA_CHOICES = ['0 — нет', '1', '2', '3 — выражено'];
const ACT_CHOICES = ['1', '2', '3', '4', '5'];
const UAS_WHEALS = ['0', '1–6', '7–12', '>12'];
const UAS_ITCH = ['0 — нет', '1 — слабый', '2 — умеренный', '3 — сильный'];

function choiceStep(id: string, label: string, choices: string[]): DiaryStep {
  return { id, label, field: 'choice', choices, required: true };
}

function textStep(id: string, label: string, placeholder: string, required = true): DiaryStep {
  return { id, label, field: 'text', placeholder, required };
}

export function getClinicalScaleSection(scaleId: ClinicalScaleId): DiarySection {
  const meta = CLINICAL_SCALES.find((s) => s.id === scaleId)!;

  switch (scaleId) {
    case 'aria-lite':
      return {
        type: 'Шкала',
        title: meta.title,
        icon: 'analytics',
        steps: [
          choiceStep('ariaCongestion', 'Заложенность носа', ARIA_CHOICES),
          choiceStep('ariaRhinorrhea', 'Выделения из носа', ARIA_CHOICES),
          choiceStep('ariaSneezing', 'Чихание', ARIA_CHOICES),
          choiceStep('ariaItching', 'Зуд в носу / глазах', ARIA_CHOICES),
        ],
      };
    case 'act':
      return {
        type: 'Шкала',
        title: meta.title,
        icon: 'analytics',
        steps: [
          choiceStep('actActivity', 'Ограничение активности из-за астмы', ACT_CHOICES),
          choiceStep('actBreath', 'Одышка', ACT_CHOICES),
          choiceStep('actNight', 'Симптомы ночью', ACT_CHOICES),
          choiceStep('actReliever', 'Использование препарата скорой помощи', ACT_CHOICES),
          choiceStep('actControl', 'Общая оценка контроля астмы', ACT_CHOICES),
        ],
      };
    case 'scorad-lite':
      return {
        type: 'Шкала',
        title: meta.title,
        icon: 'analytics',
        steps: [
          textStep('scoradExtent', 'Площадь поражения (%)', 'Например: 20'),
          choiceStep('scoradItch', 'Интенсивность зуда (0–10)', [
            '0', '1–2', '3–4', '5–6', '7–8', '9–10',
          ]),
          choiceStep('scoradSleep', 'Нарушение сна', ['0 — нет', '1 — лёгкое', '2 — умеренное', '3 — сильное']),
        ],
      };
    case 'uas7':
      return {
        type: 'Шкала',
        title: meta.title,
        icon: 'analytics',
        steps: [
          choiceStep('uasWheals', 'Количество элементов сыпи', UAS_WHEALS),
          choiceStep('uasItch', 'Интенсивность зуда', UAS_ITCH),
        ],
      };
    default:
      return { type: 'Шкала', title: meta.title, icon: 'analytics', steps: [] };
  }
}

function parseChoiceNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const match = value.match(/^(\d+)/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

function parsePercent(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const num = Number(value.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num) || num < 0 || num > 100) return null;
  return num;
}

export function getScaleIdFromAnswers(answers: Record<string, string>): ClinicalScaleId | null {
  const raw = answers.scaleId?.trim();
  if (raw && CLINICAL_SCALES.some((s) => s.id === raw)) return raw as ClinicalScaleId;
  if (answers.ariaCongestion) return 'aria-lite';
  if (answers.actActivity) return 'act';
  if (answers.scoradExtent) return 'scorad-lite';
  if (answers.uasWheals) return 'uas7';
  return null;
}

export function validateClinicalScale(answers: Record<string, string>): string | null {
  const scaleId = getScaleIdFromAnswers(answers);
  if (!scaleId) return 'Выберите тип шкалы.';

  const section = getClinicalScaleSection(scaleId);
  for (const step of section.steps) {
    if (!step.required) continue;
    const value = answers[step.id]?.trim();
    if (!value) return `Заполните поле «${step.label}».`;
  }

  const score = computeScaleScore(scaleId, answers);
  if (!score) return 'Проверьте корректность ответов шкалы.';
  return null;
}

export function computeScaleScore(
  scaleId: ClinicalScaleId,
  answers: Record<string, string>,
): ScaleScoreResult | null {
  switch (scaleId) {
    case 'aria-lite': {
      const values = ['ariaCongestion', 'ariaRhinorrhea', 'ariaSneezing', 'ariaItching'].map(
        (key) => parseChoiceNumber(answers[key]),
      );
      if (values.some((v) => v === null)) return null;
      const nums = values as number[];
      const total = nums.reduce((sum, v) => sum + v, 0);
      if (total <= 3) return { total, interpretation: 'Лёгкая выраженность', level: 'good' };
      if (total <= 7) return { total, interpretation: 'Умеренная выраженность', level: 'moderate' };
      return { total, interpretation: 'Выраженная симптоматика', level: 'severe' };
    }
    case 'act': {
      const values = ['actActivity', 'actBreath', 'actNight', 'actReliever', 'actControl'].map(
        (key) => parseChoiceNumber(answers[key]),
      );
      if (values.some((v) => v === null || (v ?? 0) < 1 || (v ?? 0) > 5)) return null;
      const nums = values as number[];
      const total = nums.reduce((sum, v) => sum + v, 0);
      if (total >= 20) return { total, interpretation: 'Хороший контроль', level: 'good' };
      if (total >= 16) return { total, interpretation: 'Частичный контроль', level: 'moderate' };
      return { total, interpretation: 'Недостаточный контроль — консультация врача', level: 'uncontrolled' };
    }
    case 'scorad-lite': {
      const extent = parsePercent(answers.scoradExtent);
      const itch = parseChoiceNumber(answers.scoradItch);
      const sleep = parseChoiceNumber(answers.scoradSleep);
      if (extent === null || itch === null || sleep === null) return null;
      const itchMid = itch <= 2 ? itch : itch <= 4 ? 3 : itch <= 6 ? 5 : itch <= 8 ? 7 : 9;
      const total = Math.round(extent * 0.2 + itchMid + sleep * 2);
      if (total < 15) return { total, interpretation: 'Лёгкое течение (ориентир)', level: 'good' };
      if (total < 30) return { total, interpretation: 'Средняя тяжесть (ориентир)', level: 'moderate' };
      return { total, interpretation: 'Тяжёлое течение (ориентир)', level: 'severe' };
    }
    case 'uas7': {
      const whealsMap: Record<string, number> = { '0': 0, '1–6': 1, '7–12': 2, '>12': 3 };
      const itchMap: Record<string, number> = {
        '0 — нет': 0,
        '1 — слабый': 1,
        '2 — умеренный': 2,
        '3 — сильный': 3,
      };
      const wheals = whealsMap[answers.uasWheals ?? ''];
      const itch = itchMap[answers.uasItch ?? ''];
      if (wheals === undefined || itch === undefined) return null;
      const total = wheals + itch;
      if (total <= 1) return { total, interpretation: 'Минимальная активность', level: 'good' };
      if (total <= 3) return { total, interpretation: 'Умеренная активность', level: 'moderate' };
      return { total, interpretation: 'Высокая активность', level: 'severe' };
    }
    default:
      return null;
  }
}

export function formatScaleSummary(answers: Record<string, string>): string {
  const scaleId = getScaleIdFromAnswers(answers);
  if (!scaleId) return 'Шкала без оценки';

  const meta = CLINICAL_SCALES.find((s) => s.id === scaleId);
  const score = computeScaleScore(scaleId, answers);
  if (!score || !meta) return meta?.title ?? 'Шкала';

  return `${meta.title}: ${score.total} баллов — ${score.interpretation}`;
}

export function enrichScaleAnswers(answers: Record<string, string>): Record<string, string> {
  const scaleId = getScaleIdFromAnswers(answers);
  if (!scaleId) return answers;
  const score = computeScaleScore(scaleId, answers);
  if (!score) return answers;
  return {
    ...answers,
    scaleScore: String(score.total),
    scaleInterpretation: score.interpretation,
  };
}

export function buildScaleInitialAnswers(scaleId: ClinicalScaleId): Record<string, string> {
  return { scaleId };
}
