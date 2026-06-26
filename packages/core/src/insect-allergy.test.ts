import { describe, expect, it } from 'vitest';
import {
  buildInsectStingPrefill,
  computeInsectStingSummary,
  createDefaultInsectActionPlan,
  extractInsectAllergensFromProfile,
  formatInsectReportSummary,
  formatInsectStingEntrySummary,
  getConsolidatedInsectList,
  isInsectPlanConfigured,
  parseInsectActionPlan,
  profileEnablesInsectFocus,
  serializeInsectActionPlan,
} from './insect-allergy';
import { encodeDiaryDetails } from './diary';

describe('insect-allergy', () => {
  it('serializes and parses insect action plan', () => {
    const plan = {
      ...createDefaultInsectActionPlan(),
      knownInsects: ['Пчёлы', 'Осы'],
      adrenalineLocation: 'Сумка, внешний карман',
      emergencySteps: 'Адреналин по плану врача, вызов 103',
    };
    const parsed = parseInsectActionPlan(serializeInsectActionPlan(plan));
    expect(parsed?.knownInsects).toEqual(['Пчёлы', 'Осы']);
    expect(parsed?.adrenalineLocation).toContain('Сумка');
  });

  it('extracts insect allergens from profile', () => {
    expect(extractInsectAllergensFromProfile(['Осы', 'Молоко'])).toContain('Укусы насекомых');
    expect(
      getConsolidatedInsectList(['Осы'], { ...createDefaultInsectActionPlan(), knownInsects: ['Шершни'] }),
    ).toEqual(expect.arrayContaining(['Шершни']));
  });

  it('enables insect focus by condition or profile', () => {
    expect(profileEnablesInsectFocus(['insect'], [])).toBe(true);
    expect(profileEnablesInsectFocus(['food'], ['Осы'])).toBe(true);
    expect(profileEnablesInsectFocus(['rhinitis'], [])).toBe(false);
  });

  it('builds sting prefill from profile and plan', () => {
    const prefill = buildInsectStingPrefill(['Осы'], {
      ...createDefaultInsectActionPlan(),
      adrenalineLocation: 'Рюкзак',
      emergencySteps: 'Адреналин 0.3 мг',
    });
    expect(prefill.insectType).toBeTruthy();
    expect(prefill.adrenalineLocation).toBe('Рюкзак');
    expect(prefill.emergencyPlan).toContain('Адреналин');
  });

  it('computes sting summary and formats entry', () => {
    const details = encodeDiaryDetails({
      insectType: 'Осы',
      stingLocation: 'Рука',
      stingSeverity: 'Тяжёлая',
      adrenalineUsed: 'Да',
    });
    const summary = computeInsectStingSummary(
      [{ type: 'Укус насекомого', details, createdAt: new Date().toISOString() }],
      30,
    );
    expect(summary.totalStings).toBe(1);
    expect(summary.severe).toBe(1);
    expect(summary.adrenalineUsed).toBe(1);

    const entryText = formatInsectStingEntrySummary({
      insectType: 'Осы',
      stingSeverity: 'Умеренная',
      localSymptoms: 'Отёк',
    });
    expect(entryText).toContain('Осы');
    expect(entryText).toContain('Отёк');
  });

  it('formats doctor report summary', () => {
    const text = formatInsectReportSummary(
      { totalStings: 2, severe: 1, adrenalineUsed: 1, lastSeverity: 'Тяжёлая', lastStingAt: null },
      {
        knownInsects: ['Пчёлы'],
        adrenalineLocation: 'Сумка',
        periodDays: 30,
      },
    );
    expect(text).toContain('Пчёлы');
    expect(text).toContain('Укусов: 2');
  });

  it('detects configured plan', () => {
    expect(isInsectPlanConfigured(null)).toBe(false);
    expect(isInsectPlanConfigured(createDefaultInsectActionPlan())).toBe(false);
    expect(
      isInsectPlanConfigured({ ...createDefaultInsectActionPlan(), knownInsects: ['Осы'] }),
    ).toBe(true);
  });
});
