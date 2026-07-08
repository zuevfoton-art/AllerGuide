/** Canonical allergy symptom id with SNOMED CT / ICD-11 crosswalk (C.1). */
export interface SymptomConcept {
  id: string;
  labelRu: string;
  snomed: string;
  snomedLabel: string;
  icd11: string;
  icd11Label: string;
  /** Keywords for inferring from free-text symptom descriptions. */
  keywords: string[];
}

export const SYMPTOM_CATALOG: SymptomConcept[] = [
  {
    id: 'nasal-congestion',
    labelRu: 'Заложенность носа',
    snomed: '68235000',
    snomedLabel: 'Nasal congestion',
    icd11: 'MD11.0',
    icd11Label: 'Allergic rhinitis',
    keywords: ['заложен', 'заложенност', 'носов'],
  },
  {
    id: 'rhinorrhea',
    labelRu: 'Выделения из носа',
    snomed: '64531003',
    snomedLabel: 'Rhinorrhea',
    icd11: 'MD11.0',
    icd11Label: 'Allergic rhinitis',
    keywords: ['насморк', 'выделен', 'сопл', 'ринор'],
  },
  {
    id: 'sneezing',
    labelRu: 'Чихание',
    snomed: '76067001',
    snomedLabel: 'Sneezing',
    icd11: 'MD11.0',
    icd11Label: 'Allergic rhinitis',
    keywords: ['чих'],
  },
  {
    id: 'ocular-itching',
    labelRu: 'Зуд глаз',
    snomed: '418290006',
    snomedLabel: 'Itching of eye',
    icd11: '9A60.0',
    icd11Label: 'Allergic conjunctivitis',
    keywords: ['зуд глаз', 'чешутся глаз', 'глаз чеш'],
  },
  {
    id: 'conjunctival-redness',
    labelRu: 'Покраснение глаз',
    snomed: '75705005',
    snomedLabel: 'Hyperemia of eye',
    icd11: '9A60.0',
    icd11Label: 'Allergic conjunctivitis',
    keywords: ['красн глаз', 'покраснен глаз', 'конъюнктив', 'слез'],
  },
  {
    id: 'cough',
    labelRu: 'Кашель',
    snomed: '49727002',
    snomedLabel: 'Cough',
    icd11: 'CA23.0',
    icd11Label: 'Allergic asthma',
    keywords: ['кашел'],
  },
  {
    id: 'wheeze',
    labelRu: 'Одышка / свистящее дыхание',
    snomed: '56018004',
    snomedLabel: 'Wheezing',
    icd11: 'CA23.0',
    icd11Label: 'Allergic asthma',
    keywords: ['одыш', 'свист', 'астм', 'бронх', 'свистящ'],
  },
  {
    id: 'chest-tightness',
    labelRu: 'Стеснение в груди',
    snomed: '23924001',
    snomedLabel: 'Tightness in chest',
    icd11: 'CA23.0',
    icd11Label: 'Allergic asthma',
    keywords: ['стеснен', 'груд', 'ком в груди'],
  },
  {
    id: 'urticaria',
    labelRu: 'Крапивница',
    snomed: '126485001',
    snomedLabel: 'Urticaria',
    icd11: 'EB00',
    icd11Label: 'Urticaria',
    keywords: ['крапивниц', 'сыпь', 'волдыр'],
  },
  {
    id: 'angioedema',
    labelRu: 'Отёк (ангионевротический)',
    snomed: '41291007',
    snomedLabel: 'Angioedema',
    icd11: 'EB04',
    icd11Label: 'Angioedema',
    keywords: ['отёк', 'отек', 'ангионевр', 'губ', 'лиц', 'квинке'],
  },
  {
    id: 'laryngeal-edema',
    labelRu: 'Отёк гортани / осиплость',
    snomed: '278528006',
    snomedLabel: 'Swelling of larynx',
    icd11: 'CA08.Z',
    icd11Label: 'Hypersensitivity reaction, unspecified',
    keywords: ['гортан', 'осипл', 'охрип', 'душ'],
  },
  {
    id: 'anaphylaxis',
    labelRu: 'Анафилаксия',
    snomed: '39579001',
    snomedLabel: 'Anaphylaxis',
    icd11: '4A85',
    icd11Label: 'Anaphylaxis',
    keywords: ['анафилакс', 'анafil', 'шок', 'anaф'],
  },
  {
    id: 'hypotension-syncope',
    labelRu: 'Падение давления / обморок',
    snomed: '271594007',
    snomedLabel: 'Syncope',
    icd11: '4A85',
    icd11Label: 'Anaphylaxis',
    keywords: ['обморок', 'давлен', 'гипотен', 'слабость', 'терял сознан'],
  },
  {
    id: 'nausea',
    labelRu: 'Тошнота',
    snomed: '422587007',
    snomedLabel: 'Nausea',
    icd11: 'CA08.3',
    icd11Label: 'Food allergy',
    keywords: ['тошнот'],
  },
  {
    id: 'vomiting',
    labelRu: 'Рвота',
    snomed: '422400008',
    snomedLabel: 'Vomiting',
    icd11: 'CA08.3',
    icd11Label: 'Food allergy',
    keywords: ['рвот', 'рвало'],
  },
  {
    id: 'diarrhea',
    labelRu: 'Диарея',
    snomed: '62315008',
    snomedLabel: 'Diarrhea',
    icd11: 'CA08.3',
    icd11Label: 'Food allergy',
    keywords: ['диар', 'понос', 'жидк стул'],
  },
  {
    id: 'gi-symptoms',
    labelRu: 'Боль в животе (ЖКТ)',
    snomed: '21522001',
    snomedLabel: 'Abdominal pain',
    icd11: 'CA08.3',
    icd11Label: 'Food allergy',
    keywords: ['живот', 'жкт', 'боль в жив', 'абдомин'],
  },
  {
    id: 'pruritus',
    labelRu: 'Зуд кожи',
    snomed: '418363000',
    snomedLabel: 'Itching of skin',
    icd11: 'EA90',
    icd11Label: 'Atopic dermatitis',
    keywords: ['зуд', 'чес', 'чешется'],
  },
];

const catalogById = new Map(SYMPTOM_CATALOG.map((item) => [item.id, item]));

export function getSymptomConcept(id: string): SymptomConcept | undefined {
  return catalogById.get(id);
}

export function getSymptomCatalogChoices(): string[] {
  return SYMPTOM_CATALOG.map((item) => item.labelRu);
}

export function symptomIdFromChoiceLabel(label: string): string | null {
  const match = SYMPTOM_CATALOG.find((item) => item.labelRu === label.trim());
  return match?.id ?? null;
}

/** Infer symptom codes from free-text description. */
export function inferSymptomCodesFromText(text: string): string[] {
  const lower = text.toLowerCase();
  if (!lower.trim()) return [];
  const found = new Set<string>();
  for (const concept of SYMPTOM_CATALOG) {
    if (concept.keywords.some((kw) => lower.includes(kw))) {
      found.add(concept.id);
    }
  }
  return [...found];
}

export function resolveSymptomCodes(answers: Record<string, string>): string[] {
  const codes = new Set<string>();

  const primary = answers.symptomCode?.trim();
  if (primary) {
    const id = symptomIdFromChoiceLabel(primary);
    if (id) codes.add(id);
  }

  const stored = answers.symptomCodes?.trim();
  if (stored) {
    for (const part of stored.split(',')) {
      const id = part.trim();
      if (catalogById.has(id)) codes.add(id);
    }
  }

  for (const id of inferSymptomCodesFromText(answers.symptoms ?? '')) {
    codes.add(id);
  }

  return [...codes];
}

export interface CodedSymptomLine {
  id: string;
  labelRu: string;
  snomed: string;
  icd11: string;
}

export function buildCodedSymptomLines(codes: string[]): CodedSymptomLine[] {
  return codes
    .map((id) => catalogById.get(id))
    .filter((item): item is SymptomConcept => Boolean(item))
    .map((item) => ({
      id: item.id,
      labelRu: item.labelRu,
      snomed: item.snomed,
      icd11: item.icd11,
    }));
}

export function formatCodedSymptomsSummary(codes: string[]): string {
  const lines = buildCodedSymptomLines(codes);
  if (!lines.length) return '';
  return lines
    .map((line) => `${line.labelRu} (SNOMED ${line.snomed}, ICD-11 ${line.icd11})`)
    .join('; ');
}

/** Enrich symptom diary answers with coded fields before save. */
export function enrichSymptomAnswers(answers: Record<string, string>): Record<string, string> {
  const codes = resolveSymptomCodes(answers);
  const coded = buildCodedSymptomLines(codes);
  if (!codes.length) return answers;

  return {
    ...answers,
    symptomCodes: codes.join(','),
    symptomSnomed: coded.map((c) => c.snomed).join(','),
    symptomIcd11: coded.map((c) => c.icd11).join(','),
    symptomCodedSummary: formatCodedSymptomsSummary(codes),
  };
}
