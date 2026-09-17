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
    expect(LIGHT_CLARO_TOKENS.accent).toBe('#2A9D8F');
    expect(LIGHT_CLARO_TOKENS.accentLight).toBe('#E6F6F4');
    expect(LIGHT_CLARO_TOKENS.accentMid).toBe('#9FD9D1');
  });

  it('info and tip alias product accent tokens (light)', () => {
    expect(LIGHT_CLARO_TOKENS.info).toBe(LIGHT_CLARO_TOKENS.accent);
    expect(LIGHT_CLARO_TOKENS.infoLight).toBe(LIGHT_CLARO_TOKENS.accentLight);
    expect(LIGHT_CLARO_TOKENS.tipBg).toBe(LIGHT_CLARO_TOKENS.accentLight);
    expect(LIGHT_CLARO_TOKENS.tipBorder).toBe(LIGHT_CLARO_TOKENS.accentMid);
    expect(LIGHT_CLARO_TOKENS.tipText).toBe('#1F6B62');
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
    expect(light.colors).toEqual(['#1F6B62', '#2A9D8F', '#9FD9D1']);

    const dark = getClaroGradient(true);
    expect(dark.colors).toEqual(['#0B1120', '#134E48', '#2A9D8F']);

    const banned = new Set(LEGACY_MEDICAL_BLUE.map((h) => h.toUpperCase()));
    for (const stop of [...light.colors, ...dark.colors]) {
      expect(banned.has(stop.toUpperCase())).toBe(false);
    }
  });
});
