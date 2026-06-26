import { describe, expect, it } from 'vitest';
import { resolvePollenRegion } from './pollen-regions';
import {
  getCurrentPollenAlerts,
  getPollenPeaksForMonth,
  POLLEN_CALENDARS,
} from './pollen-calendar';

describe('pollen regions', () => {
  it('resolves nearest reference region by coordinates', () => {
    expect(resolvePollenRegion(55.75, 37.62).id).toBe('moscow');
    expect(resolvePollenRegion(59.93, 30.32).id).toBe('saint-petersburg');
    expect(resolvePollenRegion(45.04, 38.98).id).toBe('krasnodar');
  });
});

describe('regional pollen calendars', () => {
  it('ships calendars for all reference regions', () => {
    expect(Object.keys(POLLEN_CALENDARS).sort()).toEqual([
      'ekaterinburg',
      'krasnodar',
      'moscow',
      'novosibirsk',
      'saint-petersburg',
    ]);
  });

  it('returns Moscow birch peaks in May', () => {
    const peaks = getPollenPeaksForMonth(5, 'moscow');
    expect(peaks.some((p) => p.taxonId === 'birch_pollen')).toBe(true);
  });

  it('shifts Saint Petersburg tree pollen later than Moscow', () => {
    const moscowAlder = getPollenPeaksForMonth(3, 'moscow').some((p) => p.taxonId === 'alder_pollen');
    const spbAlder = getPollenPeaksForMonth(3, 'saint-petersburg').some(
      (p) => p.taxonId === 'alder_pollen',
    );
    expect(moscowAlder).toBe(true);
    expect(spbAlder).toBe(false);
  });

  it('filters profile alerts by allergen id via taxon id', () => {
    const alerts = getCurrentPollenAlerts(5, ['birch-pollen'], 'moscow');
    expect(alerts.map((a) => a.taxonId)).toContain('birch_pollen');
    expect(alerts.every((a) => a.allergenId === 'birch-pollen')).toBe(true);
  });

  it('does not match milk profile to birch season via substring', () => {
    const alerts = getCurrentPollenAlerts(5, ['milk'], 'moscow');
    expect(alerts).toHaveLength(0);
  });
});
