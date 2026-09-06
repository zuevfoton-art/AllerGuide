import { describe, expect, it } from 'vitest';
import { resolveMapPollenSourceCaption } from './pollen-map-source-label';

const labels = {
  calendar: 'season calendar',
  cache: 'last saved',
  openMeteo: 'Open-Meteo',
};

describe('resolveMapPollenSourceCaption', () => {
  it('hides Google Pollen on the status card', () => {
    expect(resolveMapPollenSourceCaption('google', 'google', labels)).toBe('');
    expect(resolveMapPollenSourceCaption('open-meteo', 'google', labels)).toBe('');
  });

  it('keeps calendar, cache, and Open-Meteo captions', () => {
    expect(resolveMapPollenSourceCaption('calendar', null, labels)).toBe('season calendar');
    expect(resolveMapPollenSourceCaption('cache', null, labels)).toBe('last saved');
    expect(resolveMapPollenSourceCaption('open-meteo', 'open-meteo', labels)).toBe('Open-Meteo');
  });

  it('returns empty when there is no snapshot', () => {
    expect(resolveMapPollenSourceCaption(null, 'google', labels)).toBe('');
    expect(resolveMapPollenSourceCaption(undefined, undefined, labels)).toBe('');
  });
});
