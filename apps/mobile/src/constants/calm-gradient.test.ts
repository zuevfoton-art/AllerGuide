import { describe, expect, it } from 'vitest';
import {
  DARK_CALM_TOKENS,
  getCalmGradient,
  LIGHT_CALM_TOKENS,
} from './calm-gradient';

const LEGACY_MEDICAL_BLUE = [
  '#2563EB',
  '#1D4ED8',
  '#3B82F6',
  '#EFF4FF',
  '#DBEAFE',
  '#0C4A6E',
  '#93C5FD',
  '#1E40AF',
  '#BFDBFE',
] as const;

describe('Claro green ambient tokens', () => {
  it('maps calm ambient and info to Claro teal (no medical blue)', () => {
    expect(LIGHT_CALM_TOKENS.calmMid).toBe('#2A9D8F');
    expect(LIGHT_CALM_TOKENS.calmWash).toBe('#E6F6F4');
    expect(LIGHT_CALM_TOKENS.info).toBe('#2A9D8F');
    expect(LIGHT_CALM_TOKENS.infoLight).toBe('#E6F6F4');
    expect(LIGHT_CALM_TOKENS.accent).toBe('#2A9D8F');
    expect(LIGHT_CALM_TOKENS.calmMid).toBe(LIGHT_CALM_TOKENS.accent);
  });

  it('Phase 2: ambient/info/tip alias product accent tokens (light)', () => {
    expect(LIGHT_CALM_TOKENS.calmWash).toBe(LIGHT_CALM_TOKENS.accentLight);
    expect(LIGHT_CALM_TOKENS.calmMist).toBe(LIGHT_CALM_TOKENS.accentMid);
    expect(LIGHT_CALM_TOKENS.info).toBe(LIGHT_CALM_TOKENS.accent);
    expect(LIGHT_CALM_TOKENS.infoLight).toBe(LIGHT_CALM_TOKENS.accentLight);
    expect(LIGHT_CALM_TOKENS.tipBg).toBe(LIGHT_CALM_TOKENS.accentLight);
    expect(LIGHT_CALM_TOKENS.tipBorder).toBe(LIGHT_CALM_TOKENS.accentMid);
    expect(LIGHT_CALM_TOKENS.tipText).toBe(LIGHT_CALM_TOKENS.calmDeep);
  });

  it('Phase 2: dark ambient/info stay in Claro teal family', () => {
    expect(DARK_CALM_TOKENS.calmWash).toBe(DARK_CALM_TOKENS.accentLight);
    expect(DARK_CALM_TOKENS.calmMid).toBe(DARK_CALM_TOKENS.accent);
    expect(DARK_CALM_TOKENS.info).toBe(DARK_CALM_TOKENS.accent);
    expect(DARK_CALM_TOKENS.infoLight).toBe(DARK_CALM_TOKENS.accentLight);
    expect(DARK_CALM_TOKENS.tipBg).toBe(DARK_CALM_TOKENS.accentLight);
  });

  it('rejects legacy medical blue hexes in light and dark tokens', () => {
    const values = [...Object.values(LIGHT_CALM_TOKENS), ...Object.values(DARK_CALM_TOKENS)];
    for (const hex of LEGACY_MEDICAL_BLUE) {
      expect(values).not.toContain(hex);
    }
  });

  it('returns Claro teal gradient stops for light and dark', () => {
    const light = getCalmGradient(false);
    expect(light.colors).toEqual(['#1F6B62', '#2A9D8F', '#9FD9D1']);

    const dark = getCalmGradient(true);
    expect(dark.colors).toEqual(['#0B1120', '#134E48', '#2A9D8F']);

    const banned = new Set(LEGACY_MEDICAL_BLUE.map((h) => h.toUpperCase()));
    for (const stop of [...light.colors, ...dark.colors]) {
      expect(banned.has(stop.toUpperCase())).toBe(false);
    }
  });
});
