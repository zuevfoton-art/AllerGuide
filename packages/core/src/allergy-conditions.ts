export type AllergyConditionId =
  | 'food'
  | 'pollinosis'
  | 'asthma'
  | 'rhinitis'
  | 'dermatitis'
  | 'urticaria'
  | 'household'
  | 'animal'
  | 'drug'
  | 'insect'
  | 'other';

export interface AllergyConditionOption {
  id: string;
  label: string;
  season?: 'spring' | 'summer' | 'late-summer';
}

export interface AllergyConditionType {
  id: AllergyConditionId;
  label: string;
  description: string;
  options?: AllergyConditionOption[];
  enablesPeakFlow?: boolean;
  enablesAsit?: boolean;
}

export const ALLERGY_CONDITION_TYPES: AllergyConditionType[] = [
  {
    id: 'food',
    label: 'Пищевая аллергия',
    description: 'Молоко, яйцо, пшеница, орехи, рыба, морепродукты, соя, арахис',
    options: [
      { id: 'milk', label: 'Молоко' },
      { id: 'eggs', label: 'Яйцо' },
      { id: 'wheat-gluten', label: 'Пшеница' },
      { id: 'tree-nuts', label: 'Орехи' },
      { id: 'fish', label: 'Рыба' },
      { id: 'seafood', label: 'Морепродукты' },
      { id: 'soy', label: 'Соя' },
      { id: 'peanut', label: 'Арахис' },
    ],
  },
  {
    id: 'pollinosis',
    label: 'Поллиноз',
    description: 'Аллергия на пыльцу растений по сезонам',
    options: [
      { id: 'alder', label: 'Ольха', season: 'spring' },
      { id: 'hazel', label: 'Лещина', season: 'spring' },
      { id: 'birch-pollen', label: 'Берёза', season: 'spring' },
      { id: 'oak', label: 'Дуб', season: 'spring' },
      { id: 'maple', label: 'Клён', season: 'spring' },
      { id: 'ash', label: 'Ясень', season: 'spring' },
      { id: 'willow', label: 'Ива', season: 'spring' },
      { id: 'poplar', label: 'Тополь', season: 'spring' },
      { id: 'timothy', label: 'Тимофеевка', season: 'summer' },
      { id: 'meadow', label: 'Мятлик', season: 'summer' },
      { id: 'fescue', label: 'Овсяница', season: 'summer' },
      { id: 'rye-grass', label: 'Рожь', season: 'summer' },
      { id: 'raggrass', label: 'Райграс', season: 'summer' },
      { id: 'mugwort-pollen', label: 'Полынь', season: 'late-summer' },
      { id: 'saltwort', label: 'Лебеда', season: 'late-summer' },
      { id: 'ragweed-pollen', label: 'Амброзия', season: 'late-summer' },
    ],
    enablesAsit: true,
  },
  {
    id: 'asthma',
    label: 'Бронхиальная астма',
    description: 'Хроническое заболевание дыхательных путей',
    enablesPeakFlow: true,
  },
  {
    id: 'rhinitis',
    label: 'Аллергический ринит',
    description: 'Воспаление слизистой носа',
  },
  {
    id: 'dermatitis',
    label: 'Атопический дерматит',
    description: 'Кожные проявления: экзема, нейродермит',
  },
  {
    id: 'urticaria',
    label: 'Крапивница / ангиоотёк',
    description: 'Острая или хроническая крапивница, отёк Квинке',
  },
  {
    id: 'household',
    label: 'Бытовая аллергия',
    description: 'Домашняя пыль, клещи, плесень',
    options: [
      { id: 'house-dust', label: 'Домашняя пыль' },
      { id: 'dust-mites', label: 'Клещ домашней пыли' },
      { id: 'mold', label: 'Плесень' },
    ],
  },
  {
    id: 'animal',
    label: 'Аллергия на животных',
    description: 'Кошки, собаки, грызуны, птицы',
    options: [
      { id: 'cat-dander', label: 'Кошки' },
      { id: 'dog-dander', label: 'Собаки' },
      { id: 'rodent', label: 'Грызуны' },
      { id: 'bird', label: 'Птицы' },
      { id: 'horse', label: 'Лошади' },
      { id: 'rabbit', label: 'Кролики' },
    ],
  },
  {
    id: 'drug',
    label: 'Лекарственная аллергия',
    description: 'Реакции на лекарственные препараты',
  },
  {
    id: 'insect',
    label: 'Инсектная аллергия',
    description: 'Укусы пчёл, ос, шершней, комаров',
    options: [
      { id: 'bee', label: 'Пчёлы' },
      { id: 'wasp', label: 'Осы' },
      { id: 'hornet', label: 'Шершни' },
      { id: 'mosquito', label: 'Комары' },
    ],
  },
  {
    id: 'other',
    label: 'Другие виды аллергии',
    description: 'Редкие аллергены с ручным указанием',
  },
];

export function getConditionType(id: AllergyConditionId): AllergyConditionType | undefined {
  return ALLERGY_CONDITION_TYPES.find((c) => c.id === id);
}

/** Max length for free-text name when condition type `other` is selected. */
export const OTHER_CONDITION_LABEL_MAX_LENGTH = 120;

/** Trim and clamp the free-text label for «Другие виды аллергии». */
export function normalizeOtherConditionLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().slice(0, OTHER_CONDITION_LABEL_MAX_LENGTH);
}

export function profileEnablesPeakFlow(conditionIds: AllergyConditionId[]): boolean {
  return conditionIds.includes('asthma');
}

export function profileEnablesAsit(conditionIds: AllergyConditionId[]): boolean {
  return conditionIds.includes('pollinosis');
}

const KNOWN_CONDITION_IDS = new Set<string>(ALLERGY_CONDITION_TYPES.map((item) => item.id));

export function parseConditionIds(raw: string | null | undefined): AllergyConditionId[] {
  if (!raw?.trim()) return [];
  const unique: AllergyConditionId[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!KNOWN_CONDITION_IDS.has(id)) continue;
    if (unique.includes(id as AllergyConditionId)) continue;
    unique.push(id as AllergyConditionId);
  }
  return unique;
}
