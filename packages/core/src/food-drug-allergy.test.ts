import { describe, expect, it } from 'vitest';
import {
  buildFoodPrefillFromScan,
  buildIntoleranceAlert,
  computeFoodDrugSummary,
  createDefaultFoodDrugRegistry,
  extractFoodAllergensFromProfile,
  formatFoodDrugReportSummary,
  getConsolidatedFoodAvoidList,
  matchDrugIntolerance,
  parseFoodDrugRegistry,
  profileEnablesDrugFocus,
  profileEnablesFoodFocus,
  serializeFoodDrugRegistry,
} from './food-drug-allergy';
import { encodeDiaryDetails } from './diary';

describe('food-drug-allergy', () => {
  it('parses and serializes registry', () => {
    const registry = {
      ...createDefaultFoodDrugRegistry(),
      extraAvoidFoods: ['Кунжут'],
      clinicalNotes: 'Строгое исключение',
    };
    const parsed = parseFoodDrugRegistry(serializeFoodDrugRegistry(registry));
    expect(parsed?.extraAvoidFoods).toEqual(['Кунжут']);
    expect(parsed?.clinicalNotes).toBe('Строгое исключение');
  });

  it('extracts food allergens from profile list', () => {
    expect(extractFoodAllergensFromProfile(['Молоко', 'Берёза'])).toContain('Молоко');
    expect(getConsolidatedFoodAvoidList(['Арахис'], { v: 1, extraAvoidFoods: ['Кунжут'], clinicalNotes: '' })).toEqual([
      'Арахис',
      'Кунжут',
    ]);
  });

  it('matches drug intolerances with class aliases', () => {
    expect(matchDrugIntolerance('Нурофен 200', ['Ибупрофен'])).toBe('Ибупрофен');
    expect(matchDrugIntolerance('АЦК', ['Аспирин'])).toBe('Аспирин');
    expect(buildIntoleranceAlert('Нурофен', ['Ибупрофен'])).toContain('Ибупрофен');
  });

  it('builds food prefill from scan', () => {
    const prefill = buildFoodPrefillFromScan({
      productName: 'Йогурт',
      verdict: 'Риск',
      level: 'high',
      matches: ['Молоко'],
      createdAt: new Date().toISOString(),
    });
    expect(prefill.food).toBe('Йогурт');
    expect(prefill.foodSource).toBe('Сканер');
    expect(prefill.allergens).toBe('Молоко');
  });

  it('computes food and drug summary', () => {
    const entries = [
      {
        type: 'Питание',
        details: encodeDiaryDetails({ food: 'Суп', reaction: 'Умеренная' }),
        createdAt: new Date().toISOString(),
      },
      {
        type: 'Лекарство',
        details: encodeDiaryDetails({
          medicine: 'Нурофен',
          dosage: '200 мг',
          intoleranceAlert: '⚠',
          sideEffectSeverity: 'Лёгкая',
        }),
        createdAt: new Date().toISOString(),
      },
    ];
    const summary = computeFoodDrugSummary(entries, 30);
    expect(summary.foodEntries).toBe(1);
    expect(summary.drugEntries).toBe(1);
    expect(summary.drugWarnings).toBe(1);
    expect(summary.drugSideEffects.mild).toBe(1);
  });

  it('formats report summary', () => {
    const text = formatFoodDrugReportSummary(
      computeFoodDrugSummary(
        [
          {
            type: 'Питание',
            details: encodeDiaryDetails({ food: 'Орехи', reaction: 'Сильная' }),
            createdAt: new Date().toISOString(),
          },
        ],
        30,
      ),
      {
        avoidFoods: ['Орехи'],
        drugIntolerances: ['Аспирин'],
        periodDays: 30,
      },
    );
    expect(text).toContain('Пищевые аллергены');
    expect(text).toContain('Непереносимые ЛС');
  });

  it('enables focus cards by profile context', () => {
    expect(profileEnablesFoodFocus(['rhinitis'], ['Молоко'])).toBe(true);
    expect(profileEnablesDrugFocus(['food'], ['Ибупрофен'])).toBe(true);
    expect(profileEnablesFoodFocus(['rhinitis'], [])).toBe(false);
  });
});
