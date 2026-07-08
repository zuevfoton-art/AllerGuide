import { describe, expect, it } from 'vitest';
import {
  computePefPercentOfBest,
  computePefZone,
  formatPefZoneLabel,
  parsePefNumeric,
  resolvePersonalBestPef,
} from './pef-zones';

describe('pef zones', () => {
  it('parses numeric PEF values', () => {
    expect(parsePefNumeric('320')).toBe(320);
    expect(parsePefNumeric('320 л/мин')).toBe(320);
    expect(parsePefNumeric('')).toBeNull();
    expect(parsePefNumeric(0)).toBeNull();
  });

  it('computes GINA traffic-light zones', () => {
    const best = 400;
    expect(computePefZone(360, best)).toBe('green');
    expect(computePefZone(320, best)).toBe('green');
    expect(computePefZone(280, best)).toBe('yellow');
    expect(computePefZone(200, best)).toBe('yellow');
    expect(computePefZone(180, best)).toBe('red');
    expect(computePefPercentOfBest(320, best)).toBe(80);
  });

  it('formats zone labels in Russian', () => {
    expect(formatPefZoneLabel('green')).toBe('Зелёная зона');
    expect(formatPefZoneLabel('red')).toBe('Красная зона');
  });

  it('resolves personal best with priority', () => {
    expect(
      resolvePersonalBestPef({
        explicitBest: '350',
        planBest: '400',
        entryBests: ['380'],
        historicalValues: [300],
      }),
    ).toBe(350);

    expect(
      resolvePersonalBestPef({
        planBest: '400',
        entryBests: ['380'],
        historicalValues: [300, 360],
      }),
    ).toBe(400);

    expect(
      resolvePersonalBestPef({
        entryBests: ['380', '420'],
        historicalValues: [300],
      }),
    ).toBe(420);

    expect(resolvePersonalBestPef({ historicalValues: [300, 360] })).toBe(360);
  });
});
