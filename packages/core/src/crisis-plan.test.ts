import { describe, expect, it } from 'vitest';
import { buildCrisisPlan, parsePersonalCrisisPlanSteps } from './crisis-plan';

describe('buildCrisisPlan', () => {
  it('falls back to the four default steps without a personal plan', () => {
    const plan = buildCrisisPlan(null);
    expect(plan.source).toBe('default');
    expect(plan.steps).toEqual([
      { source: 'default', id: 'epinephrine' },
      { source: 'default', id: 'callEmergency' },
      { source: 'default', id: 'stay' },
      { source: 'default', id: 'secondDose' },
    ]);
  });

  it('treats a blank personal plan as no plan', () => {
    expect(buildCrisisPlan('   \n\n  ').source).toBe('default');
  });

  it('prefers the doctor-provided plan', () => {
    const plan = buildCrisisPlan('Адреналин в бедро\n\nВызвать 103\n');
    expect(plan.source).toBe('personal');
    expect(plan.steps).toEqual([
      { source: 'personal', text: 'Адреналин в бедро' },
      { source: 'personal', text: 'Вызвать 103' },
    ]);
  });
});

describe('parsePersonalCrisisPlanSteps', () => {
  it('drops empty lines and trims', () => {
    expect(parsePersonalCrisisPlanSteps('  a \n\n b  \n')).toEqual(['a', 'b']);
  });

  it('returns nothing for undefined', () => {
    expect(parsePersonalCrisisPlanSteps(undefined)).toEqual([]);
  });
});
