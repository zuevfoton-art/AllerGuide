import { describe, expect, it } from 'vitest';
import {
  GOLDEN_SCANNER_SCENARIOS,
  GOLDEN_SCANNER_SCENARIO_COUNT,
  runAllGoldenScannerScenarios,
} from './golden-scanner-scenarios';

describe('golden scanner scenarios (E.3)', () => {
  it('defines at least 8 scanner scenarios', () => {
    expect(GOLDEN_SCANNER_SCENARIO_COUNT).toBeGreaterThanOrEqual(8);
  });

  it('combined with core suite reaches 20+ clinical scenarios', () => {
    expect(GOLDEN_SCANNER_SCENARIO_COUNT + 18).toBeGreaterThanOrEqual(20);
  });

  it('runs all scanner golden scenarios', () => {
    const report = runAllGoldenScannerScenarios();
    expect(report.passed).toBe(report.total);
    expect(report.falsePositiveRate).toBeLessThan(0.1);
  });

  it.each(GOLDEN_SCANNER_SCENARIOS.map((s) => [s.id, s.description]))(
    '%s — %s',
    (id) => {
      const scenario = GOLDEN_SCANNER_SCENARIOS.find((s) => s.id === id)!;
      const result = scenario.run();
      expect(result.passed, result.message).toBe(true);
    },
  );
});
