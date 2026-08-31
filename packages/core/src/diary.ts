import { formatScaleSummary } from './clinical-scales';
import { enrichSeverityAnswers, formatSeveritySummary, normalizeSeverity } from './diary-severity';
import { enrichSymptomAnswers, enrichFoodAnswers, formatCodedSymptomsSummary, getSymptomCatalogChoices, resolveSymptomCodes } from './symptom-coding';
import { formatAsitSummary } from './asit-therapy';
import { formatFoodEntrySummary, formatMedicineEntrySummary } from './food-drug-allergy';
import { formatInsectStingEntrySummary } from './insect-allergy';
import { buildPrescribedTherapyDiarySummary } from './prescribed-therapy';

export type DiaryStepField = 'text' | 'choice' | 'photo' | 'checklist' | 'time' | 'datetime';

/** Auto/duplicate steps: collected on save, never shown in the full wizard or history. */
export const DIARY_AUTO_STEP_IDS = new Set([
  'symptomAreas',
  // Legacy 0–10 scale, superseded by severity0_3 and normalised on read.
  'intensity',
  'intoleranceAlert',
  'sideEffectSeverity',
  'effect',
  'pollenContext',
  'recentScan',
  'todayMeds',
  'scanRef',
  'foodSource',
  'knownInsects',
  'adrenalineLocation',
  'emergencyPlan',
  'medicineForm',
  'medicineActiveSubstance',
  'medicineUsage',
  'medicineAgeNote',
  'medicineSource',
  'medicinePhotos',
]);

export const DIARY_PHOTO_ANSWER_IDS = ['skinPhotos', 'medicinePhotos'] as const;

export const DIARY_HISTORY_HIDDEN_TYPES = new Set(['Шкала']);

export function isDiaryHistoryVisible(type: string): boolean {
  return !DIARY_HISTORY_HIDDEN_TYPES.has(type);
}

export interface DiaryStep {
  id: string;
  label: string;
  placeholder?: string;
  field: DiaryStepField;
  choices?: string[];
  multiline?: boolean;
  /**
   * For `choice` fields: allow selecting several chips.
   * Values are stored as labels joined by {@link MULTI_CHOICE_SEPARATOR}.
   */
  multiSelect?: boolean;
  required?: boolean;
  /** Optional clinical / help text (tooltip-level). */
  hint?: string;
  /** Consecutive steps sharing a group id are asked on one wizard screen. */
  group?: string;
}

/**
 * Split section steps into wizard screens. Consecutive steps that declare the
 * same group are asked together, so related questions stop costing a tap each.
 */
export function groupDiaryStepsIntoScreens(steps: DiaryStep[]): DiaryStep[][] {
  const screens: DiaryStep[][] = [];

  for (const step of steps) {
    const current = screens.at(-1);
    if (step.group && current && current[0].group === step.group) {
      current.push(step);
      continue;
    }
    screens.push([step]);
  }

  return screens;
}

/** Separator for multi-select diary choice answers (labels never contain it). */
export const MULTI_CHOICE_SEPARATOR = '\n';

export function parseMultiChoiceValue(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(MULTI_CHOICE_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function serializeMultiChoiceValue(values: string[]): string {
  const unique: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
  }
  return unique.join(MULTI_CHOICE_SEPARATOR);
}

export function toggleMultiChoiceValue(
  raw: string | undefined | null,
  choice: string,
): string {
  const current = parseMultiChoiceValue(raw);
  const next = current.includes(choice)
    ? current.filter((item) => item !== choice)
    : [...current, choice];
  return serializeMultiChoiceValue(next);
}

export interface DiarySection {
  type: string;
  title: string;
  icon: string;
  steps: DiaryStep[];
}

export interface StructuredDiaryPayload {
  v: 1;
  answers: Record<string, string>;
}

export const DIARY_SECTIONS: DiarySection[] = [
  {
    type: 'Симптомы',
    title: 'Симптомы',
    icon: 'pulse',
    steps: [
      {
        id: 'symptomCode',
        label: 'Симптомы (из справочника)',
        field: 'choice',
        choices: getSymptomCatalogChoices(),
        multiSelect: true,
        required: false,
        group: 'symptoms',
      },
      {
        id: 'symptoms',
        label: 'Какие симптомы наблюдаются?',
        placeholder: 'Например: зуд, отёк губ, кашель',
        field: 'text',
        multiline: true,
        required: true,
        group: 'symptoms',
      },
      {
        id: 'severity0_3',
        label: 'Выраженность симптомов (0–3)',
        field: 'choice',
        choices: ['0 — нет', '1 — лёгкая', '2 — умеренная', '3 — сильная'],
        required: true,
      },
      {
        id: 'intensity',
        label: 'Насколько выражены симптомы? (устар.)',
        field: 'choice',
        choices: [
          '0 — нет',
          '1',
          '2',
          '3',
          '4',
          '5 — умеренно',
          '6',
          '7',
          '8',
          '9',
          '10 — очень сильно',
        ],
        required: false,
      },
      {
        id: 'symptomAreas',
        label: 'Зоны симптомов',
        field: 'choice',
        choices: ['Нос', 'Глаза', 'Дыхание', 'Кожа', 'ЖКТ', 'Общее'],
        required: false,
      },
      {
        id: 'onset',
        label: 'Когда началось?',
        placeholder: 'Например: сегодня утром, 2 часа назад',
        field: 'text',
        required: false,
      },
    ],
  },
  {
    type: 'Лекарство',
    title: 'Лекарство',
    icon: 'medkit',
    steps: [
      {
        id: 'medicine',
        label: 'Название препарата',
        placeholder: 'Например: цетиризин',
        field: 'text',
        required: true,
        group: 'medicine',
      },
      {
        id: 'dosage',
        label: 'Дозировка',
        placeholder: 'Например: 10 мг, 1 таблетка',
        field: 'text',
        required: true,
        group: 'medicine',
      },
      {
        id: 'takenAt',
        label: 'Время приёма',
        placeholder: 'Выберите время',
        field: 'time',
        required: false,
        group: 'medicine',
      },
      {
        id: 'intoleranceAlert',
        label: 'Предупреждение о непереносимости (авто)',
        placeholder: 'Подставляется из паспорта SOS при совпадении',
        field: 'text',
        multiline: true,
        required: false,
      },
      {
        id: 'sideEffectSeverity',
        label: 'Побочная реакция',
        field: 'choice',
        choices: ['Нет', 'Лёгкая', 'Умеренная', 'Сильная'],
        required: false,
      },
      {
        id: 'effect',
        label: 'Эффект или побочная реакция',
        placeholder: 'Стало ли лучше? Были ли побочные эффекты?',
        field: 'text',
        multiline: true,
        required: false,
      },
      {
        id: 'medicineForm',
        label: 'Форма выпуска (авто)',
        field: 'text',
        required: false,
      },
      {
        id: 'medicineActiveSubstance',
        label: 'Действующее вещество (авто)',
        field: 'text',
        required: false,
      },
      {
        id: 'medicineUsage',
        label: 'Применение (авто)',
        field: 'text',
        multiline: true,
        required: false,
      },
      {
        id: 'medicineAgeNote',
        label: 'Возрастное ограничение (авто)',
        field: 'text',
        required: false,
      },
      {
        id: 'medicineSource',
        label: 'Источник распознавания (авто)',
        field: 'text',
        required: false,
      },
      {
        id: 'medicinePhotos',
        label: 'Фото упаковки',
        field: 'photo',
        required: false,
      },
    ],
  },
  {
    type: 'Питание',
    title: 'Питание',
    icon: 'restaurant',
    steps: [
      {
        id: 'food',
        label: 'Что было съедено?',
        placeholder: 'Блюда, продукты, напитки',
        field: 'text',
        multiline: true,
        required: true,
        hint: 'Введите блюдо вручную — состав распознается как в сканере, затем уровень реакции.',
      },
      {
        id: 'foodComponents',
        label: 'Состав блюда',
        field: 'checklist',
        required: false,
      },
      {
        id: 'foodSource',
        label: 'Источник записи',
        field: 'choice',
        choices: ['Вручную', 'Сканер'],
        required: false,
      },
      {
        id: 'scanRef',
        label: 'Сканирование (авто)',
        placeholder: 'Подставляется из сканера',
        field: 'text',
        required: false,
      },
      {
        id: 'reaction',
        label: 'Реакция после еды',
        field: 'choice',
        choices: ['Нет реакции', 'Лёгкая', 'Умеренная', 'Сильная'],
        required: true,
        group: 'reaction',
      },
      {
        id: 'reactionType',
        label: 'Тип реакции',
        group: 'reaction',
        field: 'choice',
        choices: [
          'Нет',
          'Реакция во рту и горле',
          'ЖКТ',
          'Кожа',
          'Дыхание',
          'Анафилаксия',
        ],
        required: false,
        hint: '«Реакция во рту и горле» — ораллергический синдром (OAS)',
      },
    ],
  },
  {
    type: 'Триггер',
    title: 'Триггер',
    icon: 'warning',
    steps: [
      {
        id: 'trigger',
        label: 'Что стало триггером?',
        placeholder: 'Пыльца, животное, стресс, продукт…',
        field: 'text',
        required: true,
        group: 'trigger',
      },
      {
        id: 'context',
        label: 'Где и при каких обстоятельствах?',
        placeholder: 'Дом, улица, в гостях…',
        field: 'text',
        multiline: true,
        required: false,
        group: 'trigger',
      },
      {
        id: 'pollenContext',
        label: 'Уровень пыльцы (авто)',
        placeholder: 'Подставляется из сводки самочувствия',
        field: 'text',
        required: false,
      },
      {
        id: 'recentScan',
        label: 'Последнее сканирование (авто)',
        placeholder: 'Подставляется из сканера за 24 ч',
        field: 'text',
        required: false,
      },
      {
        id: 'todayMeds',
        label: 'Принятые ЛС сегодня (авто)',
        placeholder: 'Подставляется из записей «Лекарство»',
        field: 'text',
        required: false,
      },
      {
        id: 'triggerNotes',
        label: 'Дополнительные детали',
        placeholder: 'Что ещё важно зафиксировать?',
        field: 'text',
        multiline: true,
        required: false,
      },
    ],
  },
  {
    type: 'Кожа',
    title: 'Кожа',
    icon: 'body',
    steps: [
      {
        id: 'skinArea',
        label: 'Какая зона кожи поражена?',
        placeholder: 'Лицо, руки, шея…',
        field: 'text',
        required: true,
        group: 'skin',
      },
      {
        id: 'appearance',
        label: 'Как выглядит кожа?',
        placeholder: 'Покраснение, сыпь, сухость, отёк…',
        field: 'text',
        multiline: true,
        required: true,
        group: 'skin',
      },
      {
        id: 'itching',
        label: 'Интенсивность зуда',
        field: 'choice',
        choices: ['Нет', 'Слабый', 'Умеренный', 'Сильный'],
        required: true,
        group: 'skin',
      },
      {
        id: 'skinPhotos',
        label: 'Фото проявлений',
        field: 'photo',
        required: false,
      },
      {
        id: 'skinNotes',
        label: 'Что помогло или ухудшило состояние?',
        field: 'text',
        multiline: true,
        required: false,
      },
    ],
  },
  {
    type: 'Пикфлоуметрия',
    title: 'Пикфлоуметрия',
    icon: 'speedometer',
    steps: [
      {
        id: 'pefTime',
        label: 'Время измерения',
        field: 'choice',
        choices: ['Утро', 'Вечер'],
        required: true,
        group: 'pef',
      },
      {
        id: 'pefValue',
        label: 'Значение ПСВ (л/мин)',
        placeholder: 'Например: 320',
        field: 'text',
        required: true,
        group: 'pef',
      },
      {
        id: 'pefBest',
        label: 'Лучшее значение за период (если известно)',
        placeholder: 'Например: 400',
        field: 'text',
        required: false,
      },
      {
        id: 'pefNotes',
        label: 'Комментарий',
        placeholder: 'Самочувствие, приступ, лекарства…',
        field: 'text',
        multiline: true,
        required: false,
      },
    ],
  },
  {
    type: 'Укус насекомого',
    title: 'Укус насекомого',
    icon: 'bug',
    steps: [
      {
        id: 'insectType',
        label: 'Насекомое',
        field: 'choice',
        choices: ['Пчёлы', 'Осы', 'Шершни', 'Комары', 'Другое'],
        required: true,
      },
      {
        id: 'knownInsects',
        label: 'Известные аллергены (авто)',
        placeholder: 'Подставляется из профиля и плана действий',
        field: 'text',
        required: false,
      },
      {
        id: 'stingLocation',
        label: 'Место укуса',
        placeholder: 'Рука, лицо, шея…',
        field: 'text',
        required: true,
      },
      {
        id: 'stingSeverity',
        label: 'Тяжесть реакции',
        field: 'choice',
        choices: ['Лёгкая', 'Умеренная', 'Тяжёлая', 'Анафилаксия'],
        required: true,
      },
      {
        id: 'localSymptoms',
        label: 'Местные симптомы',
        field: 'choice',
        choices: ['Покраснение', 'Отёк', 'Зуд', 'Боль', 'Крапивница', 'Нет'],
        required: false,
      },
      {
        id: 'systemicSymptoms',
        label: 'Системные симптомы',
        field: 'choice',
        choices: ['Нет', 'Зуд кожи', 'Одышка', 'Головокружение', 'Тошнота', 'Падение давления'],
        required: false,
      },
      {
        id: 'adrenalineUsed',
        label: 'Использован адреналин',
        field: 'choice',
        choices: ['Нет', 'Да'],
        required: false,
      },
      {
        id: 'adrenalineLocation',
        label: 'Где хранится адреналин (авто)',
        placeholder: 'Из плана действий',
        field: 'text',
        required: false,
      },
      {
        id: 'emergencyPlan',
        label: 'План действий (авто)',
        placeholder: 'Из плана действий',
        field: 'text',
        multiline: true,
        required: false,
      },
      {
        id: 'treatment',
        label: 'Оказанная помощь',
        placeholder: 'Антигистаминное, холод, вызов 103…',
        field: 'text',
        multiline: true,
        required: false,
      },
      {
        id: 'stingNotes',
        label: 'Дополнительные заметки',
        field: 'text',
        multiline: true,
        required: false,
      },
    ],
  },
  {
    type: 'АСИТ',
    title: 'АСИТ',
    icon: 'fitness',
    steps: [
      {
        id: 'asitAllergen',
        label: 'Аллерген курса',
        placeholder: 'Например: пыльца берёзы, клещ',
        field: 'text',
        required: true,
      },
      {
        id: 'asitDrug',
        label: 'Название препарата',
        placeholder: 'Как указал врач',
        field: 'text',
        required: true,
      },
      {
        id: 'asitRoute',
        label: 'Путь введения',
        field: 'choice',
        choices: ['Подъязычная (SLIT)', 'Подкожная (SCIT)'],
        required: true,
      },
      {
        id: 'asitPhase',
        label: 'Фаза терапии',
        field: 'choice',
        choices: ['Наращивание дозы', 'Поддерживающая терапия'],
        required: true,
      },
      {
        id: 'asitSchedule',
        label: 'Схема приёма (описание)',
        placeholder: 'По назначению врача, без коррекции доз в приложении',
        field: 'text',
        multiline: true,
        required: false,
      },
      {
        id: 'asitTakenAt',
        label: 'Дата и время приёма',
        placeholder: 'Выберите дату и время',
        field: 'datetime',
        required: true,
      },
      {
        id: 'asitDoseNumber',
        label: 'Номер приёма / дозы (если известен)',
        placeholder: 'Например: 12-й приём',
        field: 'text',
        required: false,
      },
      {
        id: 'asitOnSchedule',
        label: 'Соблюдение графика',
        field: 'choice',
        choices: ['В срок', 'С опозданием', 'Пропущена'],
        required: true,
      },
      {
        id: 'asitLocalReaction',
        label: 'Местная реакция (для подкожной АСИТ)',
        field: 'choice',
        choices: ['Нет', 'Покраснение', 'Отёк', 'Зуд', 'Другое'],
        required: false,
      },
      {
        id: 'asitReaction',
        label: 'Системная (общая) реакция',
        field: 'choice',
        choices: ['Нет реакции', 'Лёгкая', 'Умеренная', 'Сильная'],
        required: true,
      },
      {
        id: 'asitComment',
        label: 'Комментарий',
        placeholder: 'Самочувствие, особые обстоятельства…',
        field: 'text',
        multiline: true,
        required: false,
      },
    ],
  },
  {
    type: 'Визит к врачу',
    title: 'Визит к врачу',
    icon: 'calendar',
    steps: [
      {
        id: 'visitDoctorType',
        label: 'Тип врача',
        field: 'choice',
        choices: ['Аллерголог', 'Педиатр', 'Пульмонолог', 'Иммунолог', 'Другой'],
        required: true,
      },
      {
        id: 'visitDate',
        label: 'Дата и время визита',
        placeholder: '25 июня, 14:30',
        field: 'text',
        required: true,
      },
      {
        id: 'visitComment',
        label: 'Комментарий',
        placeholder: 'Подготовить отчёт за 30 дней',
        field: 'text',
        multiline: true,
        required: false,
      },
    ],
  },
  {
    type: 'Заметка',
    title: 'Заметка',
    icon: 'create',
    steps: [
      {
        id: 'noteTitle',
        label: 'Краткий заголовок',
        placeholder: 'Например: визит к аллергологу',
        field: 'text',
        required: false,
      },
      {
        id: 'noteBody',
        label: 'Подробная заметка',
        placeholder: 'Любые наблюдения, которые хотите сохранить',
        field: 'text',
        multiline: true,
        required: true,
      },
    ],
  },
  {
    type: 'Терапия',
    title: 'Назначенная терапия',
    icon: 'medical',
    steps: [
      {
        id: 'therapyDrug',
        label: 'Препарат',
        placeholder: 'Как указал врач',
        field: 'text',
        required: true,
      },
      {
        id: 'therapyDosage',
        label: 'Дозировка',
        placeholder: 'Например: 1 таблетка, 2 вдоха',
        field: 'text',
        required: false,
      },
      {
        id: 'therapyTakenAt',
        label: 'Дата и время приёма',
        placeholder: 'Выберите дату и время',
        field: 'datetime',
        required: true,
      },
      {
        id: 'therapyStatus',
        label: 'Соблюдение графика',
        field: 'choice',
        choices: ['В срок', 'С опозданием', 'Пропущена'],
        required: true,
      },
      {
        id: 'therapyReaction',
        label: 'Реакция / побочный эффект',
        field: 'choice',
        choices: ['Нет', 'Лёгкая', 'Умеренная', 'Сильная'],
        required: false,
      },
      {
        id: 'therapyComment',
        label: 'Комментарий',
        placeholder: 'Самочувствие, особые обстоятельства…',
        field: 'text',
        multiline: true,
        required: false,
      },
    ],
  },
];

export function getDiarySection(type: string): DiarySection | undefined {
  return DIARY_SECTIONS.find((section) => section.type === type);
}

export function getDiaryStepLabel(section: DiarySection, stepId: string): string {
  return section.steps.find((step) => step.id === stepId)?.label ?? stepId;
}

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

export function getDiaryStepAnswers(section: DiarySection, answers: Record<string, string>): string[] {
  return section.steps
    .map((step) => answers[step.id]?.trim())
    .filter((value): value is string => Boolean(value));
}

export function hasSectionAnswers(section: DiarySection, answers: Record<string, string>): boolean {
  return getDiaryStepAnswers(section, answers).length > 0;
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
