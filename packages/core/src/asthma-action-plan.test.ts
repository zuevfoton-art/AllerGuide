import { describe, expect, it } from 'vitest';
import {
  createDefaultAsthmaActionPlan,
  formatAsthmaReportSummary,
  isAsthmaPlanConfigured,
  parseAsthmaActionPlan,
  serializeAsthmaActionPlan,
} from './asthma-action-plan';

describe('asthma action plan', () => {
  it('round-trips plan JSON', () => {
    const plan = createDefaultAsthmaActionPlan();
    plan.personalBestPef = '420';
    plan.yellowZoneSteps = 'Удвоить ингалятор по схеме врача';
    const parsed = parseAsthmaActionPlan(serializeAsthmaActionPlan(plan));
    expect(parsed?.personalBestPef).toBe('420');
    expect(parsed?.yellowZoneSteps).toContain('ингалятор');
  });

  it('detects configured plan', () => {
    expect(isAsthmaPlanConfigured(null)).toBe(false);
    expect(isAsthmaPlanConfigured(createDefaultAsthmaActionPlan())).toBe(false);
    const plan = createDefaultAsthmaActionPlan();
    plan.redZoneSteps = 'Вызвать 103';
    expect(isAsthmaPlanConfigured(plan)).toBe(true);
  });

  it('formats report summary with PEF trend', () => {
    const text = formatAsthmaReportSummary(
      {
        count: 3,
        latest: 280,
        personalBest: 400,
        latestZone: 'Жёлтая зона',
        latestPercentOfBest: 70,
      },
      {
        ...createDefaultAsthmaActionPlan(),
        personalBestPef: '400',
        relieverMedication: 'Сальбутамол',
      },
      { periodDays: 14 },
    );
    expect(text).toContain('14 дней');
    expect(text).toContain('Сальбутамол');
    expect(text).toContain('Измерений ПСВ: 3');
  });
});
