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

describe('Nordic Air tokens (UX/UI v2 · B)', () => {
  it('product accent family has no calm.* keys', () => {
    const lightKeys = Object.keys(LIGHT_CLARO_TOKENS);
    const darkKeys = Object.keys(DARK_CLARO_TOKENS);
    expect(lightKeys.some((k) => k.startsWith('calm'))).toBe(false);
    expect(darkKeys.some((k) => k.startsWith('calm'))).toBe(false);
    expect(LIGHT_CLARO_TOKENS.accent).toBe('#4F8FB8');
    expect(LIGHT_CLARO_TOKENS.accentLight).toBe('#D9EAF5');
    expect(LIGHT_CLARO_TOKENS.accentMid).toBe('#A8C9DC');
  });

  it('info and tip alias product accent tokens (light)', () => {
    expect(LIGHT_CLARO_TOKENS.info).toBe(LIGHT_CLARO_TOKENS.accent);
    expect(LIGHT_CLARO_TOKENS.infoLight).toBe(LIGHT_CLARO_TOKENS.accentLight);
    expect(LIGHT_CLARO_TOKENS.tipBg).toBe(LIGHT_CLARO_TOKENS.accentLight);
    expect(LIGHT_CLARO_TOKENS.tipBorder).toBe(LIGHT_CLARO_TOKENS.accentMid);
    expect(LIGHT_CLARO_TOKENS.tipText).toBe('#3A6F92');
  });

  it('dark info/tip stay in Nordic Air sky family', () => {
    expect(DARK_CLARO_TOKENS.info).toBe(DARK_CLARO_TOKENS.accent);
    expect(DARK_CLARO_TOKENS.infoLight).toBe(DARK_CLARO_TOKENS.accentLight);
    expect(DARK_CLARO_TOKENS.tipBg).toBe(DARK_CLARO_TOKENS.accentLight);
  });

  it('rejects legacy Dual Calm medical blue hexes', () => {
    const values = [...Object.values(LIGHT_CLARO_TOKENS), ...Object.values(DARK_CLARO_TOKENS)];
    for (const hex of LEGACY_MEDICAL_BLUE) {
      expect(values).not.toContain(hex);
    }
  });

  it('returns warm-sky gradient stops for light and dark', () => {
    const light = getClaroGradient(false);
    expect(light.colors).toEqual(['#3A6F92', '#4F8FB8', '#D9EAF5']);

    const dark = getClaroGradient(true);
    expect(dark.colors).toEqual(['#0E1618', '#243846', '#4F8FB8']);

    const banned = new Set(LEGACY_MEDICAL_BLUE.map((h) => h.toUpperCase()));
    for (const stop of [...light.colors, ...dark.colors]) {
      expect(banned.has(stop.toUpperCase())).toBe(false);
    }
  });
});
