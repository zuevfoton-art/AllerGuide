import { describe, expect, it } from 'vitest';
import { getCalmGradient, LIGHT_CALM_TOKENS } from './calm-gradient';

describe('Claro green ambient tokens', () => {
  it('maps calm ambient and info to Claro teal (no medical blue)', () => {
    expect(LIGHT_CALM_TOKENS.calmMid).toBe('#2A9D8F');
    expect(LIGHT_CALM_TOKENS.calmWash).toBe('#E6F6F4');
    expect(LIGHT_CALM_TOKENS.info).toBe('#2A9D8F');
    expect(LIGHT_CALM_TOKENS.infoLight).toBe('#E6F6F4');
    expect(LIGHT_CALM_TOKENS.accent).toBe('#2A9D8F');
    expect(LIGHT_CALM_TOKENS.calmMid).toBe(LIGHT_CALM_TOKENS.accent);
  });

  it('rejects legacy medical blue hexes in light tokens', () => {
    const legacyBlue = ['#2563EB', '#1D4ED8', '#3B82F6', '#EFF4FF', '#DBEAFE', '#0C4A6E'];
    const values = Object.values(LIGHT_CALM_TOKENS);
    for (const hex of legacyBlue) {
      expect(values).not.toContain(hex);
    }
  });

  it('returns Claro teal gradient stops for light and dark', () => {
    const light = getCalmGradient(false);
    expect(light.colors).toEqual(['#1F6B62', '#2A9D8F', '#9FD9D1']);

    const dark = getCalmGradient(true);
    expect(dark.colors).toEqual(['#0B1120', '#134E48', '#2A9D8F']);
  });
});
