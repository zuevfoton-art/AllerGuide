/**
 * Golden scanner scenarios (E.3) — product / cross-reaction checks.
 */

import { runMockScan } from './scan';

export interface GoldenScannerScenario {
  id: string;
  description: string;
  run: () => { passed: boolean; message?: string };
}

export const GOLDEN_SCANNER_SCENARIOS: GoldenScannerScenario[] = [
  {
    id: 'scanner-01-milk-direct',
    description: 'Milk profile + lactose ingredient → match',
    run: () => {
      const result = runMockScan({
        mode: 'product',
        text: 'лактоза, вода',
        profile: { allergies: JSON.stringify(['Молоко']) },
      });
      return result.matches.includes('Молоко')
        ? { passed: true }
        : { passed: false, message: 'expected milk match' };
    },
  },
  {
    id: 'scanner-02-peanut-direct-high',
    description: 'Peanut + peanut ingredient → high when combined with milk',
    run: () => {
      const result = runMockScan({
        mode: 'product',
        text: 'молоко, арахис',
        profile: { allergies: JSON.stringify(['Молоко', 'Арахис']) },
      });
      return result.level === 'high' ? { passed: true } : { passed: false, message: `level=${result.level}` };
    },
  },
  {
    id: 'scanner-03-clean-product',
    description: 'Rice + water → low risk for milk/peanut profile',
    run: () => {
      const result = runMockScan({
        mode: 'product',
        text: 'рис, вода',
        profile: { allergies: JSON.stringify(['Молоко', 'Арахис']) },
      });
      return result.level === 'low' ? { passed: true } : { passed: false, message: `level=${result.level}` };
    },
  },
  {
    id: 'scanner-04-birch-oas',
    description: 'Birch pollen + apple → cross-reaction medium',
    run: () => {
      const result = runMockScan({
        mode: 'product',
        text: 'яблоко, сахар',
        profile: { allergies: JSON.stringify(['Пыльца берёзы']) },
      });
      const hasCross = result.crossMatches.length > 0;
      return hasCross && result.level !== 'low'
        ? { passed: true }
        : { passed: false, message: 'expected cross match' };
    },
  },
  {
    id: 'scanner-05-dust-seafood-cross',
    description: 'Dust mite + shrimp → cross-reaction',
    run: () => {
      const result = runMockScan({
        mode: 'product',
        text: 'креветки',
        profile: { allergies: JSON.stringify(['Пылевые клещи']) },
      });
      return result.crossMatches.length > 0 ? { passed: true } : { passed: false, message: 'no cross match' };
    },
  },
  {
    id: 'scanner-06-fish-cross',
    description: 'Fish allergy + salmon → cross match',
    run: () => {
      const result = runMockScan({
        mode: 'product',
        text: 'лосось',
        profile: { allergies: JSON.stringify(['Рыба']) },
      });
      return result.crossMatches.some((m) => m.includes('рыб'))
        ? { passed: true }
        : { passed: false, message: 'expected fish cross' };
    },
  },
  {
    id: 'scanner-07-empty-profile',
    description: 'No profile allergies → low even with allergens in text',
    run: () => {
      const result = runMockScan({
        mode: 'product',
        text: 'молоко, арахис',
        profile: { allergies: JSON.stringify([]) },
      });
      return result.level === 'low' ? { passed: true } : { passed: false, message: `level=${result.level}` };
    },
  },
  {
    id: 'scanner-08-menu-mode',
    description: 'Menu mode preserves mode in result',
    run: () => {
      const result = runMockScan({
        mode: 'menu',
        text: 'салат с орехами',
        profile: { allergies: JSON.stringify(['Арахис']) },
      });
      return result.mode === 'menu' ? { passed: true } : { passed: false, message: `mode=${result.mode}` };
    },
  },
];

export function runAllGoldenScannerScenarios(): {
  total: number;
  passed: number;
  falsePositiveRate: number;
} {
  let passed = 0;
  let falsePositives = 0;

  for (const scenario of GOLDEN_SCANNER_SCENARIOS) {
    const result = scenario.run();
    if (result.passed) passed++;
    else if (scenario.id.includes('clean') || scenario.id.includes('empty')) falsePositives++;
  }

  const failed = GOLDEN_SCANNER_SCENARIOS.length - passed;
  return {
    total: GOLDEN_SCANNER_SCENARIOS.length,
    passed,
    falsePositiveRate: failed > 0 ? failed / GOLDEN_SCANNER_SCENARIOS.length : 0,
  };
}

export const GOLDEN_SCANNER_SCENARIO_COUNT = GOLDEN_SCANNER_SCENARIOS.length;
