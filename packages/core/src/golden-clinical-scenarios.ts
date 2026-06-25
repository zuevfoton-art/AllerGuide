/**
 * Golden clinical scenario suite (E.3) — wellness, diary, clinical scales.
 * Scanner scenarios live in `@allerguide/ai/golden-scanner-scenarios`.
 */

import { computeScaleScore } from './clinical-scales';
import { computeDiaryInsights } from './diary-stats';
import {
  buildClinicalScalesFromTrends,
  buildDiarySeriesFromInsights,
  computeWellnessConfidence,
  computeWellnessScore,
  pollenTier,
  wellnessStatusFromScore,
} from './wellness';
import type { DiaryEntry } from './types';

export type GoldenScenarioCategory = 'wellness' | 'diary' | 'clinical-scale';

export interface GoldenScenarioResult {
  passed: boolean;
  message?: string;
}

export interface GoldenScenario {
  id: string;
  category: GoldenScenarioCategory;
  description: string;
  run: () => GoldenScenarioResult;
}

function pass(message?: string): GoldenScenarioResult {
  return { passed: true, message };
}

function fail(message: string): GoldenScenarioResult {
  return { passed: false, message };
}

function makeEntry(type: string, iso: string, details = '{}'): DiaryEntry {
  return { id: 1, profileId: 1, type, details, createdAt: `${iso}T12:00:00.000Z` };
}

const baseWellness = {
  profileAllergenIds: ['birch-pollen'],
  pollenMatches: [
    {
      label: 'Берёза',
      value: 5,
      profileRelevant: true,
      taxonId: 'birch_pollen' as const,
      allergenId: 'birch-pollen',
    },
  ],
  europeanAqi: 20,
  pm25: 8,
  diary: {
    symptomDays: 0,
    triggerDays: 0,
    streak: 0,
    weekTotal: 0,
    correlationKind: null,
    temporalCorrelationKind: null,
    anomalyKind: null,
    anomalyDays: 0,
  },
  clinicalScales: [],
  foodAllergens: [] as string[],
  envDataAvailable: true,
};

export const GOLDEN_CLINICAL_SCENARIOS: GoldenScenario[] = [
  {
    id: 'wellness-01-birch-low-pollen',
    category: 'wellness',
    description: 'Low birch pollen → good wellness tier',
    run: () => {
      const score = computeWellnessScore(baseWellness);
      const status = wellnessStatusFromScore(score);
      return status.level === 'good' || status.level === 'moderate'
        ? pass(`score=${score}`)
        : fail(`expected good/moderate, got ${status.level}`);
    },
  },
  {
    id: 'wellness-02-birch-high-pollen',
    category: 'wellness',
    description: 'High birch pollen lowers score vs baseline',
    run: () => {
      const baseline = computeWellnessScore(baseWellness);
      const high = computeWellnessScore({
        ...baseWellness,
        pollenMatches: [
          { label: 'Берёза', value: 120, profileRelevant: true, taxonId: 'birch_pollen', allergenId: 'birch-pollen' },
        ],
      });
      return baseline > high ? pass(`baseline=${baseline} high=${high}`) : fail('high pollen should reduce score');
    },
  },
  {
    id: 'wellness-03-symptom-week',
    category: 'wellness',
    description: '4 symptom days in 7-day window reduce score',
    run: () => {
      const calm = computeWellnessScore(baseWellness);
      const symptomatic = computeWellnessScore({
        ...baseWellness,
        diary: { ...baseWellness.diary, symptomDays: 4, weekTotal: 6, streak: 4 },
      });
      return calm > symptomatic ? pass() : fail('symptom days should reduce score');
    },
  },
  {
    id: 'wellness-04-act-uncontrolled',
    category: 'wellness',
    description: 'Uncontrolled ACT adds clinical penalty',
    run: () => {
      const without = computeWellnessScore(baseWellness);
      const withAct = computeWellnessScore({
        ...baseWellness,
        clinicalScales: [{ scaleId: 'act', level: 'uncontrolled', total: 11, label: 'Астма' }],
      });
      return without > withAct ? pass() : fail('ACT uncontrolled should reduce score');
    },
  },
  {
    id: 'wellness-05-aria-severe',
    category: 'wellness',
    description: 'Severe ARIA-lite adds penalty',
    run: () => {
      const without = computeWellnessScore(baseWellness);
      const withAria = computeWellnessScore({
        ...baseWellness,
        clinicalScales: [{ scaleId: 'aria-lite', level: 'severe', total: 10, label: 'Ринит' }],
      });
      return without > withAria ? pass() : fail('severe ARIA should reduce score');
    },
  },
  {
    id: 'wellness-06-no-env-data',
    category: 'wellness',
    description: 'Missing env data → low confidence',
    run: () => {
      const confidence = computeWellnessConfidence({
        envDataAvailable: false,
        diaryWeekTotal: 0,
        clinicalScalesCount: 0,
      });
      return confidence === 'low' ? pass() : fail(`expected low confidence, got ${confidence}`);
    },
  },
  {
    id: 'wellness-07-rich-diary-high-confidence',
    category: 'wellness',
    description: 'Env + diary → high confidence',
    run: () => {
      const confidence = computeWellnessConfidence({
        envDataAvailable: true,
        diaryWeekTotal: 5,
        clinicalScalesCount: 1,
      });
      return confidence === 'high' ? pass() : fail(`expected high, got ${confidence}`);
    },
  },
  {
    id: 'wellness-08-grass-tier-mid',
    category: 'wellness',
    description: 'Grass pollen mid tier at 12 grains/m³',
    run: () => {
      const tier = pollenTier(12, 'grass_pollen');
      return tier.level === 'mid' ? pass() : fail(`expected mid, got ${tier.level}`);
    },
  },
  {
    id: 'wellness-09-cross-reaction-penalty',
    category: 'wellness',
    description: 'High birch pollen triggers cross-reaction penalty path',
    run: () => {
      const score = computeWellnessScore({
        ...baseWellness,
        pollenMatches: [
          { label: 'Берёза', value: 100, profileRelevant: true, taxonId: 'birch_pollen', allergenId: 'birch-pollen' },
        ],
      });
      return score < 75 ? pass(`score=${score}`) : fail('expected material penalty from high pollen');
    },
  },
  {
    id: 'wellness-10-asit-missed-doses',
    category: 'wellness',
    description: 'Missed ASIT doses reduce wellness score',
    run: () => {
      const baseline = computeWellnessScore(baseWellness);
      const withAsit = computeWellnessScore({
        ...baseWellness,
        asit: { totalDoses: 10, missed: 4, delayed: 0, severeReactions: 0 },
      });
      return baseline > withAsit ? pass() : fail('missed ASIT should reduce score');
    },
  },
  {
    id: 'diary-01-seven-day-window',
    category: 'diary',
    description: 'Diary insights cover 7 days',
    run: () => {
      const today = new Date().toISOString().slice(0, 10);
      const insights = computeDiaryInsights([makeEntry('Симптомы', today)]);
      return insights.days.length === 7 ? pass() : fail(`expected 7 days, got ${insights.days.length}`);
    },
  },
  {
    id: 'diary-02-series-from-insights',
    category: 'diary',
    description: 'Diary series maps symptom days from insights',
    run: () => {
      const today = new Date().toISOString().slice(0, 10);
      const insights = computeDiaryInsights([makeEntry('Симптомы', today), makeEntry('Еда', today)]);
      const series = buildDiarySeriesFromInsights(insights);
      return series.symptomDays >= 1 ? pass() : fail('expected at least 1 symptom day');
    },
  },
  {
    id: 'diary-03-temporal-correlation-field',
    category: 'diary',
    description: 'Insights expose temporal correlation kind (C.3)',
    run: () => {
      const insights = computeDiaryInsights([]);
      return 'temporalCorrelationKind' in insights ? pass() : fail('missing temporalCorrelationKind');
    },
  },
  {
    id: 'clinical-01-act-good-control',
    category: 'clinical-scale',
    description: 'ACT total 22 → good control',
    run: () => {
      const score = computeScaleScore('act', {
        actActivity: '5',
        actBreath: '5',
        actNight: '4',
        actReliever: '4',
        actControl: '4',
      });
      return score?.level === 'good' ? pass() : fail(`expected good, got ${score?.level}`);
    },
  },
  {
    id: 'clinical-02-act-uncontrolled',
    category: 'clinical-scale',
    description: 'ACT total 12 → uncontrolled',
    run: () => {
      const score = computeScaleScore('act', {
        actActivity: '2',
        actBreath: '2',
        actNight: '3',
        actReliever: '2',
        actControl: '3',
      });
      return score?.level === 'uncontrolled' ? pass() : fail(`expected uncontrolled, got ${score?.level}`);
    },
  },
  {
    id: 'clinical-03-aria-moderate',
    category: 'clinical-scale',
    description: 'ARIA total 5 → moderate',
    run: () => {
      const score = computeScaleScore('aria-lite', {
        ariaCongestion: '1',
        ariaRhinorrhea: '2',
        ariaSneezing: '1',
        ariaItching: '1',
      });
      return score?.level === 'moderate' ? pass() : fail(`expected moderate, got ${score?.level}`);
    },
  },
  {
    id: 'clinical-04-trend-to-wellness',
    category: 'clinical-scale',
    description: 'Scale trends map to wellness clinical scales',
    run: () => {
      const scales = buildClinicalScalesFromTrends([
        { scaleId: 'act', label: 'Астма', total: 14, interpretation: 'Недостаточный контроль', at: '2026-01-01' },
      ]);
      return scales[0]?.level === 'uncontrolled' ? pass() : fail('ACT 14 should be uncontrolled');
    },
  },
  {
    id: 'clinical-05-uas7-severe',
    category: 'clinical-scale',
    description: 'UAS7 high wheals + itch → severe',
    run: () => {
      const score = computeScaleScore('uas7', {
        uasWheals: '>12',
        uasItch: '3 — сильный',
      });
      return score?.level === 'severe' ? pass() : fail(`expected severe, got ${score?.level}`);
    },
  },
];

export function runGoldenScenario(id: string): GoldenScenarioResult {
  const scenario = GOLDEN_CLINICAL_SCENARIOS.find((item) => item.id === id);
  if (!scenario) return fail(`unknown scenario: ${id}`);
  return scenario.run();
}

export function runAllGoldenScenarios(): {
  total: number;
  passed: number;
  failed: GoldenScenario[];
} {
  const failed: GoldenScenario[] = [];
  for (const scenario of GOLDEN_CLINICAL_SCENARIOS) {
    const result = scenario.run();
    if (!result.passed) failed.push(scenario);
  }
  return {
    total: GOLDEN_CLINICAL_SCENARIOS.length,
    passed: GOLDEN_CLINICAL_SCENARIOS.length - failed.length,
    failed,
  };
}

export const GOLDEN_SCENARIO_COUNT = GOLDEN_CLINICAL_SCENARIOS.length;
