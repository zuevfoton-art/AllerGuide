export interface ShockKitItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface EpinephrineInfo {
  brand?: string;
  expiry?: string;
  location?: string;
}

export interface AllergyPassport {
  v: 1;
  drugIntolerances: string[];
  triggers: string[];
  epinephrine?: EpinephrineInfo;
  doctorName?: string;
  doctorPhone?: string;
  anaphylaxisHistory?: boolean;
  shockKit: ShockKitItem[];
}

export type AnaphylaxisGrade = 1 | 2 | 3;

export interface AnaphylaxisGradeInfo {
  grade: AnaphylaxisGrade;
  title: string;
  signs: string;
  actions: string[];
}

export const DEFAULT_SHOCK_KIT: ShockKitItem[] = [
  { id: 'epi', label: 'Автоинжектор адреналина', checked: false },
  { id: 'antihistamine', label: 'Антигистаминное (по назначению врача)', checked: false },
  { id: 'steroid', label: 'Глюкокортикостероид (по назначению врача)', checked: false },
  { id: 'plan', label: 'План действий / паспорт на бумаге', checked: false },
  { id: 'contacts', label: 'Список экстренных контактов', checked: false },
];

export const ANAPHYLAXIS_GRADES: AnaphylaxisGradeInfo[] = [
  {
    grade: 1,
    title: 'Степень 1 — кожа и слизистые',
    signs: 'Крапивница, зуд, покраснение, отёк губ/век без других систем.',
    actions: [
      'Антигистаминное по назначению врача.',
      'Наблюдение за состоянием не менее 4–6 часов (риск бифазной реакции).',
      'При нарастании симптомов — перейти к степени 2 и вызвать 103.',
    ],
  },
  {
    grade: 2,
    title: 'Степень 2 — вовлечение других систем',
    signs: 'Симптомы степени 1 + кашель, одышка, рвота, боль в животе, головокружение.',
    actions: [
      'Адреналин (автоинжектор) по индивидуальному плану врача.',
      'Вызвать скорую помощь (103).',
      'Положение с приподнятыми ногами при головокружении.',
      'Повторный приём адреналина — только по схеме врача.',
    ],
  },
  {
    grade: 3,
    title: 'Степень 3 — жизнеугрожающая реакция',
    signs: 'Шок, потеря сознания, выраженная обструкция дыхания, систолическое АД < 90 мм рт.ст.',
    actions: [
      'Немедленно адреналин (автоинжектор) по плану врача.',
      'Вызвать 103, сообщить об анафилаксии.',
      'Положение на спине, ноги приподняты (если нет рвоты).',
      'Не оставлять без наблюдения — возможна бифазная реакция.',
    ],
  },
];

export const BIPHASIC_WARNING =
  'Бифазная реакция возможна через 4–6 часов после первых симптомов. ' +
  'Наблюдайте за состоянием и следуйте плану врача.';

export function createDefaultPassport(): AllergyPassport {
  return {
    v: 1,
    drugIntolerances: [],
    triggers: [],
    shockKit: DEFAULT_SHOCK_KIT.map((item) => ({ ...item })),
  };
}

export function parsePassport(raw: string | null | undefined): AllergyPassport {
  if (!raw?.trim()) return createDefaultPassport();
  try {
    const parsed = JSON.parse(raw) as AllergyPassport;
    if (parsed?.v !== 1) return createDefaultPassport();
    return {
      v: 1,
      drugIntolerances: Array.isArray(parsed.drugIntolerances) ? parsed.drugIntolerances : [],
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
      epinephrine: parsed.epinephrine,
      doctorName: parsed.doctorName?.trim() || undefined,
      doctorPhone: parsed.doctorPhone?.trim() || undefined,
      anaphylaxisHistory: Boolean(parsed.anaphylaxisHistory),
      shockKit: mergeShockKit(parsed.shockKit),
    };
  } catch {
    return createDefaultPassport();
  }
}

function mergeShockKit(items?: ShockKitItem[]): ShockKitItem[] {
  if (!items?.length) return DEFAULT_SHOCK_KIT.map((item) => ({ ...item }));
  const byId = new Map(items.map((item) => [item.id, item]));
  return DEFAULT_SHOCK_KIT.map((defaultItem) => {
    const saved = byId.get(defaultItem.id);
    return saved ? { ...defaultItem, checked: Boolean(saved.checked) } : { ...defaultItem };
  });
}

export function serializePassport(passport: AllergyPassport): string {
  return JSON.stringify(passport);
}

export interface PassportExportInput {
  profileName: string;
  profileAge?: string;
  allergies: string[];
  passport: AllergyPassport;
  emergencyNumber?: string;
}

export function formatPassportText(input: PassportExportInput): string {
  const { passport: p } = input;
  const lines: string[] = [
    '═══ ПАСПОРТ АЛЛЕРГИКА · AllerGuide ═══',
    `Имя: ${input.profileName}`,
  ];

  if (input.profileAge) lines.push(`Возраст: ${input.profileAge}`);
  if (input.allergies.length) lines.push(`Аллергены: ${input.allergies.join(', ')}`);
  if (p.drugIntolerances.length) lines.push(`Непереносимые ЛС: ${p.drugIntolerances.join(', ')}`);
  if (p.triggers.length) lines.push(`Триггеры: ${p.triggers.join(', ')}`);

  if (p.epinephrine?.brand || p.epinephrine?.expiry || p.epinephrine?.location) {
    const parts = [
      p.epinephrine.brand,
      p.epinephrine.expiry ? `годен до ${p.epinephrine.expiry}` : null,
      p.epinephrine.location ? `хранится: ${p.epinephrine.location}` : null,
    ].filter(Boolean);
    lines.push(`Адреналин: ${parts.join(', ')}`);
  }

  if (p.doctorName || p.doctorPhone) {
    lines.push(`Врач: ${[p.doctorName, p.doctorPhone].filter(Boolean).join(' · ')}`);
  }

  if (p.anaphylaxisHistory) lines.push('⚠ В анамнезе: тяжёлая аллергическая реакция');

  const kitChecked = p.shockKit.filter((i) => i.checked).map((i) => i.label);
  if (kitChecked.length) lines.push(`В наборе: ${kitChecked.join('; ')}`);

  if (input.emergencyNumber) lines.push(`Экстренный номер: ${input.emergencyNumber}`);
  lines.push('', 'Данные внесены пользователем. Не является медицинским назначением.');

  return lines.join('\n');
}

export function formatPassportHtml(input: PassportExportInput): string {
  const text = formatPassportText(input).replace(/\n/g, '<br/>');
  return `
    <html><body style="font-family:Helvetica,Arial,sans-serif;padding:24px;color:#20322a;">
      <h1 style="color:#FF6B00;">Паспорт аллергика</h1>
      <p style="font-size:14px;line-height:1.6;">${text}</p>
      <hr/>
      <p style="font-size:11px;color:#666;">Информация внесена пользователем и не является медицинским назначением.</p>
    </body></html>`;
}
