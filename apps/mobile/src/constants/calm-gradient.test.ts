import { describe, expect, it } from 'vitest';
import { getCalmGradient, LIGHT_CALM_TOKENS } from './calm-gradient';

describe('Dual Calm tokens', () => {
  it('defines light calm ambient colors separate from Claro accent', () => {
    expect(LIGHT_CALM_TOKENS.calmMid).toBe('#2563EB');
    expect(LIGHT_CALM_TOKENS.accent).toBe('#2A9D8F');
    expect(LIGHT_CALM_TOKENS.info).toBe('#2563EB');
  });

  it('returns calm gradient stops for light and dark', () => {
    const light = getCalmGradient(false);
    expect(light.colors).toEqual(['#1E3A5F', '#2563EB', '#3B82F6']);

    const dark = getCalmGradient(true);
    expect(dark.colors[0]).toBe('#0B1120');
    expect(dark.colors[2]).toBe('#1D4ED8');
  });
});
