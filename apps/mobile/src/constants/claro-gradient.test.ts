import { describe, expect, it } from 'vitest';
import {
  DARK_CLARO_TOKENS,
  getClaroGradient,
  LIGHT_CLARO_TOKENS,
} from './claro-gradient';

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

describe('Claro Green tokens (Phase 0 + 4)', () => {
  it('product accent family has no calm.* keys', () => {
    const lightKeys = Object.keys(LIGHT_CLARO_TOKENS);
    const darkKeys = Object.keys(DARK_CLARO_TOKENS);
    expect(lightKeys.some((k) => k.startsWith('calm'))).toBe(false);
    expect(darkKeys.some((k) => k.startsWith('calm'))).toBe(false);
    expect(LIGHT_CLARO_TOKENS.accent).toBe('#5B8C7A');
    expect(LIGHT_CLARO_TOKENS.accentLight).toBe('#EAF2EA');
    expect(LIGHT_CLARO_TOKENS.accentMid).toBe('#B8CFC4');
  });

  it('info and tip alias product accent tokens (light)', () => {
    expect(LIGHT_CLARO_TOKENS.info).toBe(LIGHT_CLARO_TOKENS.accent);
    expect(LIGHT_CLARO_TOKENS.infoLight).toBe(LIGHT_CLARO_TOKENS.accentLight);
    expect(LIGHT_CLARO_TOKENS.tipBg).toBe(LIGHT_CLARO_TOKENS.accentLight);
    expect(LIGHT_CLARO_TOKENS.tipBorder).toBe(LIGHT_CLARO_TOKENS.accentMid);
    expect(LIGHT_CLARO_TOKENS.tipText).toBe('#3D6B5C');
  });

  it('dark info/tip stay in Claro teal family', () => {
    expect(DARK_CLARO_TOKENS.info).toBe(DARK_CLARO_TOKENS.accent);
    expect(DARK_CLARO_TOKENS.infoLight).toBe(DARK_CLARO_TOKENS.accentLight);
    expect(DARK_CLARO_TOKENS.tipBg).toBe(DARK_CLARO_TOKENS.accentLight);
  });

  it('rejects legacy medical blue hexes (Phase 0 banlist)', () => {
    const values = [...Object.values(LIGHT_CLARO_TOKENS), ...Object.values(DARK_CLARO_TOKENS)];
    for (const hex of LEGACY_MEDICAL_BLUE) {
      expect(values).not.toContain(hex);
    }
  });

  it('returns Claro teal gradient stops for light and dark', () => {
    const light = getClaroGradient(false);
    expect(light.colors).toEqual(['#3D6B5C', '#5B8C7A', '#B8CFC4']);

    const dark = getClaroGradient(true);
    expect(dark.colors).toEqual(['#0B1612', '#1A2E28', '#5B8C7A']);

    const banned = new Set(LEGACY_MEDICAL_BLUE.map((h) => h.toUpperCase()));
    for (const stop of [...light.colors, ...dark.colors]) {
      expect(banned.has(stop.toUpperCase())).toBe(false);
    }
  });
});
