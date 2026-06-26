import { describe, expect, it } from 'vitest';
import {
  normalizeSeverity,
  parseSeverity0_3,
  severityFromIntensity10,
  SEVERITY_0_3_LABELS,
} from './diary-severity';

describe('diary-severity (C.2)', () => {
  it('parses unified 0-3 choices', () => {
    expect(parseSeverity0_3('2 — умеренная')).toBe(2);
    expect(SEVERITY_0_3_LABELS[2]).toBe('Умеренная');
  });

  it('maps legacy 0-10 intensity to 0-3', () => {
    expect(severityFromIntensity10('0 — нет')).toBe(0);
    expect(severityFromIntensity10('5 — умеренно')).toBe(2);
    expect(severityFromIntensity10('10 — очень сильно')).toBe(3);
  });

  it('normalizes food reaction labels', () => {
    expect(normalizeSeverity({ reaction: 'Умеренная' }, 'Питание')).toBe(2);
  });
});
