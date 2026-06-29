import { describe, expect, it } from 'vitest';
import {
  GOLDEN_CLINICAL_SCENARIOS,
  GOLDEN_SCENARIO_COUNT,
  runAllGoldenScenarios,
} from './golden-clinical-scenarios';

describe('golden clinical scenarios (E.3)', () => {
  it('defines at least 18 core scenarios', () => {
    expect(GOLDEN_SCENARIO_COUNT).toBeGreaterThanOrEqual(18);
  });

  it('runs all core golden scenarios without failure', () => {
    const report = runAllGoldenScenarios();
    if (report.failed.length > 0) {
      const ids = report.failed.map((s) => s.id).join(', ');
      throw new Error(`Failed golden scenarios: ${ids}`);
    }
    expect(report.passed).toBe(report.total);
  });

  it.each(GOLDEN_CLINICAL_SCENARIOS.map((s) => [s.id, s.description]))(
    '%s — %s',
    (id) => {
      const scenario = GOLDEN_CLINICAL_SCENARIOS.find((s) => s.id === id)!;
      const result = scenario.run();
      expect(result.passed, result.message).toBe(true);
    },
  );
});
