import type { AllergyConditionId } from './allergy-conditions';
import { getCrossReactionsFor } from './cross-reactions';
import type {
  ComorbidityLink,
  ConditionHistory,
  ConditionOnsetKind,
} from './condition-history';
import { getConditionEpisode } from './condition-history';
import type { ProfileAllergenId } from './profile-allergens';

export type ClinicalPhenotypeId =
  | 'atopic-march-child'
  | 'aria-asthma'
  | 'aria-conjunctivitis'
  | 'food-anaphylaxis-risk'
  | 'pollen-food-oas'
  | 'dustmite-seafood'
  | 'insect-venom-severe'
  | 'drug-respiratory'
  | 'adult-onset-food'
  | 'polysensitized';

export interface ClinicalPhenotype {
  id: ClinicalPhenotypeId;
  label: string;
  description: string;
  source: string;
}

export interface ClinicalPhenotypeContext {
  conditionIds: AllergyConditionId[];
  history?: ConditionHistory | null;
  comorbidityLinks?: ComorbidityLink[];
  allergenIds?: ProfileAllergenId[];
  anaphylaxisHistory?: boolean;
  profileType?: 'self' | 'child';
  birthYear?: number;
}

export interface ResolvedClinicalPhenotypes {
  phenotypeIds: ClinicalPhenotypeId[];
  phenotypes: ClinicalPhenotype[];
  reassessmentHints: string[];
}

export const CLINICAL_PHENOTYPE_CATALOG: ClinicalPhenotype[] = [
  {
    id: 'atopic-march-child',
    label: 'Атопический марш (детский)',
    description:
      'Последовательность: атопический дерматит → ринит/поллиноз → астма. Типична для детей с атопией.',
    source: 'РААКИ',
  },
  {
    id: 'aria-asthma',
    label: 'ARIA: ринит + астма',
    description:
      'Сочетание аллергического ринита/поллиноза и бронхиальной астмы — единый воспалительный процесс дыхательных путей.',
    source: 'EAACI ARIA 2024',
  },
  {
    id: 'aria-conjunctivitis',
    label: 'ARIA: ринит + глаза',
    description:
      'Аллергический ринит с выраженными глазными симптомами (зуд, слезотечение, покраснение).',
    source: 'EAACI ARIA 2024',
  },
  {
    id: 'food-anaphylaxis-risk',
    label: 'Пищевая аллергия + анафилаксия',
    description:
      'Пищевая аллергия с историей тяжёлых системных реакций — важен план действий и адреналин.',
    source: 'EAACI anaphylaxis',
  },
  {
    id: 'pollen-food-oas',
    label: 'Пыльца–пища (ОАС)',
    description:
      'Поллиноз с перекрёстными пищевыми реакциями (оральный аллергический синдром) на фрукты, орехи, овощи.',
    source: 'EAACI PFAS',
  },
  {
    id: 'dustmite-seafood',
    label: 'Клещ + морепродукты',
    description:
      'Сочетание сенсибилизации к клещам домашней пыли и морепродуктам (тропомиозин).',
    source: 'iFAAM',
  },
  {
    id: 'insect-venom-severe',
    label: 'Укус насекомого + тяжёлая реакция',
    description:
      'Аллергия на укусы насекомых с историей анафилаксии — обсудите с аллергологом план и АСИТ.',
    source: 'EAACI venom',
  },
  {
    id: 'drug-respiratory',
    label: 'Лекарства + дыхательная аллергия',
    description:
      'Лекарственная непереносимость на фоне астмы или ринита — осторожность с НПВС и сканером лекарств.',
    source: 'РААКИ',
  },
  {
    id: 'adult-onset-food',
    label: 'Пищевая аллергия взрослого дебюта',
    description:
      'Пищевая аллергия, впервые проявившаяся во взрослом возрасте — рекомендуется повторная оценка у аллерголога.',
    source: 'EAACI food history',
  },
  {
    id: 'polysensitized',
    label: 'Полисенсибилизация',
    description:
      'Множественная сенсибилизация к разным группам аллергенов — сложнее прогноз и подбор терапии.',
    source: 'MeDALL / MASK-air',
  },
];

const PHENOTYPE_BY_ID = new Map(CLINICAL_PHENOTYPE_CATALOG.map((item) => [item.id, item]));

const ONSET_RANK: Record<ConditionOnsetKind, number> = {
  infancy: 0,
  'early-childhood': 1,
  'school-age': 2,
  adolescence: 3,
  adulthood: 4,
  unknown: 5,
};

const RESPIRATORY_CONDITIONS: AllergyConditionId[] = [
  'rhinitis',
  'pollinosis',
  'asthma',
  'household',
];

const POLLEN_ALLERGEN_IDS = new Set([
  'birch-pollen',
  'grass-pollen',
  'ragweed-pollen',
  'mugwort-pollen',
]);

const FOOD_ALLERGEN_IDS = new Set([
  'milk',
  'eggs',
  'wheat-gluten',
  'tree-nuts',
  'fish',
  'seafood',
  'soy',
  'peanut',
  'apple',
  'hazelnut',
  'carrot',
  'tomato',
  'kiwi',
  'banana',
]);

const HOUSEHOLD_ALLERGEN_IDS = new Set(['house-dust', 'dust-mites', 'mold']);

const ANIMAL_ALLERGEN_IDS = new Set(['cat-dander', 'dog-dander']);

function hasCondition(ids: AllergyConditionId[], id: AllergyConditionId): boolean {
  return ids.includes(id);
}

function hasAnyCondition(ids: AllergyConditionId[], targets: AllergyConditionId[]): boolean {
  return targets.some((target) => ids.includes(target));
}

function onsetRank(history: ConditionHistory | null | undefined, id: AllergyConditionId): number {
  const episode = getConditionEpisode(history ?? null, id);
  return ONSET_RANK[episode?.onsetKind ?? 'unknown'];
}

function isChildProfile(ctx: ClinicalPhenotypeContext): boolean {
  if (ctx.profileType === 'child') return true;
  if (ctx.birthYear) {
    const age = new Date().getFullYear() - ctx.birthYear;
    return age < 18;
  }
  return false;
}

function linkPrecedes(
  links: ComorbidityLink[],
  earlier: AllergyConditionId,
  later: AllergyConditionId,
): boolean {
  return links.some(
    (link) =>
      link.relation === 'preceded' &&
      link.fromConditionId === earlier &&
      link.toConditionId === later,
  );
}

function matchesAtopicMarchChild(ctx: ClinicalPhenotypeContext): boolean {
  const { conditionIds, history, comorbidityLinks = [] } = ctx;
  if (!hasCondition(conditionIds, 'dermatitis')) return false;
  if (!hasCondition(conditionIds, 'asthma')) return false;
  if (!hasAnyCondition(conditionIds, ['rhinitis', 'pollinosis'])) return false;
  if (!isChildProfile(ctx)) return false;

  const middle = hasCondition(conditionIds, 'rhinitis') ? 'rhinitis' : 'pollinosis';
  const links = comorbidityLinks;

  if (links.length > 0) {
    const dermatitisBeforeMiddle =
      linkPrecedes(links, 'dermatitis', middle) ||
      linkPrecedes(links, 'dermatitis', 'pollinosis') ||
      linkPrecedes(links, 'dermatitis', 'rhinitis');
    const middleBeforeAsthma =
      linkPrecedes(links, middle, 'asthma') ||
      linkPrecedes(links, 'rhinitis', 'asthma') ||
      linkPrecedes(links, 'pollinosis', 'asthma');
    if (dermatitisBeforeMiddle && middleBeforeAsthma) return true;
  }

  const dermatitisRank = onsetRank(history, 'dermatitis');
  const middleRank = Math.min(onsetRank(history, 'rhinitis'), onsetRank(history, 'pollinosis'));
  const asthmaRank = onsetRank(history, 'asthma');

  if (dermatitisRank === 5 || middleRank === 5 || asthmaRank === 5) {
    return dermatitisRank <= middleRank && middleRank <= asthmaRank;
  }

  return dermatitisRank <= middleRank && middleRank <= asthmaRank;
}

function matchesAriaAsthma(conditionIds: AllergyConditionId[]): boolean {
  return (
    hasCondition(conditionIds, 'asthma') &&
    hasAnyCondition(conditionIds, ['rhinitis', 'pollinosis'])
  );
}

function matchesAriaConjunctivitis(
  conditionIds: AllergyConditionId[],
  history: ConditionHistory | null | undefined,
): boolean {
  if (!hasCondition(conditionIds, 'rhinitis')) return false;
  const episode = getConditionEpisode(history ?? null, 'rhinitis');
  return episode?.ocularSymptoms === true;
}

function matchesFoodAnaphylaxisRisk(
  conditionIds: AllergyConditionId[],
  anaphylaxisHistory?: boolean,
): boolean {
  return hasCondition(conditionIds, 'food') && anaphylaxisHistory === true;
}

function matchesPollenFoodOas(
  conditionIds: AllergyConditionId[],
  allergenIds: ProfileAllergenId[],
): boolean {
  if (!hasCondition(conditionIds, 'pollinosis') || !hasCondition(conditionIds, 'food')) {
    return false;
  }

  const pollenIds = allergenIds.filter((id) => POLLEN_ALLERGEN_IDS.has(id));
  if (!pollenIds.length) return false;

  for (const pollenId of pollenIds) {
    for (const match of getCrossReactionsFor(pollenId)) {
      if (match.syndrome !== 'oas' && match.syndrome !== 'pollen-food') continue;
      if (allergenIds.includes(match.allergen.id)) return true;
    }
  }

  return false;
}

function matchesDustmiteSeafood(
  conditionIds: AllergyConditionId[],
  allergenIds: ProfileAllergenId[],
): boolean {
  return (
    hasCondition(conditionIds, 'household') &&
    allergenIds.includes('dust-mites') &&
    allergenIds.includes('seafood')
  );
}

function matchesInsectVenomSevere(
  conditionIds: AllergyConditionId[],
  anaphylaxisHistory?: boolean,
): boolean {
  return hasCondition(conditionIds, 'insect') && anaphylaxisHistory === true;
}

function matchesDrugRespiratory(conditionIds: AllergyConditionId[]): boolean {
  return (
    hasCondition(conditionIds, 'drug') &&
    hasAnyCondition(conditionIds, ['asthma', 'rhinitis', 'pollinosis'])
  );
}

function matchesAdultOnsetFood(
  conditionIds: AllergyConditionId[],
  history: ConditionHistory | null | undefined,
): boolean {
  if (!hasCondition(conditionIds, 'food')) return false;
  const episode = getConditionEpisode(history ?? null, 'food');
  return episode?.onsetKind === 'adulthood';
}

function countAllergenGroups(allergenIds: ProfileAllergenId[]): number {
  let groups = 0;
  if (allergenIds.some((id) => POLLEN_ALLERGEN_IDS.has(id))) groups += 1;
  if (allergenIds.some((id) => FOOD_ALLERGEN_IDS.has(id))) groups += 1;
  if (allergenIds.some((id) => HOUSEHOLD_ALLERGEN_IDS.has(id))) groups += 1;
  if (allergenIds.some((id) => ANIMAL_ALLERGEN_IDS.has(id))) groups += 1;
  return groups;
}

function matchesPolysensitized(
  conditionIds: AllergyConditionId[],
  allergenIds: ProfileAllergenId[],
): boolean {
  const respiratoryCount = RESPIRATORY_CONDITIONS.filter((id) => conditionIds.includes(id)).length;
  return respiratoryCount >= 3 && countAllergenGroups(allergenIds) >= 2;
}

const REASSESSMENT_HINTS: Partial<Record<ClinicalPhenotypeId, string>> = {
  'adult-onset-food':
    'Пищевая аллергия с дебютом во взрослом возрасте может меняться — обсудите повторное обследование с аллергологом.',
  'food-anaphylaxis-risk':
    'При истории анафилаксии проверьте наличие адреналина и актуальность плана действий в разделе SOS.',
  'aria-asthma':
    'При сочетании ринита и астмы полезно регулярно заполнять шкалы ACT и ARIA в дневнике.',
  'atopic-march-child':
    'При атопическом марше отслеживайте кожу (SCORAD), ринит (ARIA) и астму (ACT) — это поможет врачу оценить динамику.',
  'insect-venom-severe':
    'После тяжёлой реакции на укус обсудите с аллергологом venom immunotherapy (АСИТ).',
  polysensitized:
    'При полисенсибилизации индекс самочувствия менее точен — опирайтесь на дневник и консультации врача.',
};

export function resolveClinicalPhenotypes(ctx: ClinicalPhenotypeContext): ResolvedClinicalPhenotypes {
  const conditionIds = [...new Set(ctx.conditionIds)];
  const allergenIds = ctx.allergenIds ?? [];
  const history = ctx.history ?? null;
  const comorbidityLinks = ctx.comorbidityLinks ?? history?.comorbidityLinks ?? [];

  const checks: Array<[ClinicalPhenotypeId, boolean]> = [
    ['atopic-march-child', matchesAtopicMarchChild({ ...ctx, conditionIds, comorbidityLinks })],
    ['aria-asthma', matchesAriaAsthma(conditionIds)],
    ['aria-conjunctivitis', matchesAriaConjunctivitis(conditionIds, history)],
    [
      'food-anaphylaxis-risk',
      matchesFoodAnaphylaxisRisk(conditionIds, ctx.anaphylaxisHistory),
    ],
    ['pollen-food-oas', matchesPollenFoodOas(conditionIds, allergenIds)],
    ['dustmite-seafood', matchesDustmiteSeafood(conditionIds, allergenIds)],
    [
      'insect-venom-severe',
      matchesInsectVenomSevere(conditionIds, ctx.anaphylaxisHistory),
    ],
    ['drug-respiratory', matchesDrugRespiratory(conditionIds)],
    ['adult-onset-food', matchesAdultOnsetFood(conditionIds, history)],
    ['polysensitized', matchesPolysensitized(conditionIds, allergenIds)],
  ];

  const phenotypeIds = checks.filter(([, matched]) => matched).map(([id]) => id);
  const phenotypes = phenotypeIds
    .map((id) => PHENOTYPE_BY_ID.get(id))
    .filter((item): item is ClinicalPhenotype => Boolean(item));

  const reassessmentHints = phenotypeIds
    .map((id) => REASSESSMENT_HINTS[id])
    .filter((hint): hint is string => Boolean(hint));

  return { phenotypeIds, phenotypes, reassessmentHints };
}

export function getClinicalPhenotypeById(id: ClinicalPhenotypeId): ClinicalPhenotype | undefined {
  return PHENOTYPE_BY_ID.get(id);
}

export function formatClinicalPhenotypesReportText(result: ResolvedClinicalPhenotypes): string {
  if (!result.phenotypes.length) {
    return 'Клинические фенотипы не определены (недостаточно данных).';
  }

  return result.phenotypes
    .map((item) => `• ${item.label} (${item.source})\n  ${item.description}`)
    .join('\n\n');
}
