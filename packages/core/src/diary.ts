export type DiaryStepField = 'text' | 'choice';

export interface DiaryStep {
  id: string;
  label: string;
  placeholder?: string;
  field: DiaryStepField;
  choices?: string[];
  multiline?: boolean;
  required?: boolean;
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
        id: 'symptoms',
        label: 'Какие симптомы наблюдаются?',
        placeholder: 'Например: зуд, отёк губ, кашель',
        field: 'text',
        multiline: true,
        required: true,
      },
      {
        id: 'intensity',
        label: 'Насколько выражены симптомы?',
        field: 'choice',
        choices: ['1 — слабо', '2', '3 — умеренно', '4', '5 — сильно'],
        required: true,
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
      },
      {
        id: 'dosage',
        label: 'Дозировка',
        placeholder: 'Например: 10 мг, 1 таблетка',
        field: 'text',
        required: true,
      },
      {
        id: 'takenAt',
        label: 'Время приёма',
        placeholder: 'Например: 08:30',
        field: 'text',
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
      },
      {
        id: 'allergens',
        label: 'Возможные аллергены в еде',
        placeholder: 'Молоко, орехи, глютен…',
        field: 'text',
        required: false,
      },
      {
        id: 'reaction',
        label: 'Реакция после еды',
        field: 'choice',
        choices: ['Нет реакции', 'Лёгкая', 'Умеренная', 'Сильная'],
        required: true,
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
      },
      {
        id: 'context',
        label: 'Где и при каких обстоятельствах?',
        placeholder: 'Дом, улица, в гостях…',
        field: 'text',
        multiline: true,
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
      },
      {
        id: 'appearance',
        label: 'Как выглядит кожа?',
        placeholder: 'Покраснение, сыпь, сухость, отёк…',
        field: 'text',
        multiline: true,
        required: true,
      },
      {
        id: 'itching',
        label: 'Интенсивность зуда',
        field: 'choice',
        choices: ['Нет', 'Слабый', 'Умеренный', 'Сильный'],
        required: true,
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
];

export function getDiarySection(type: string): DiarySection | undefined {
  return DIARY_SECTIONS.find((section) => section.type === type);
}

export function getDiaryStepLabel(section: DiarySection, stepId: string): string {
  return section.steps.find((step) => step.id === stepId)?.label ?? stepId;
}

export function encodeDiaryDetails(answers: Record<string, string>): string {
  const payload: StructuredDiaryPayload = { v: 1, answers };
  return JSON.stringify(payload);
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

  const section = getDiarySection(type);
  if (!section) {
    return Object.values(structured.answers)
      .filter(Boolean)
      .join(' · ');
  }

  return section.steps
    .map((step) => {
      const value = structured.answers[step.id]?.trim();
      if (!value) return null;
      return `${step.label}: ${value}`;
    })
    .filter(Boolean)
    .join(' · ');
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
