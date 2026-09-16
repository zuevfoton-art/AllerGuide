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

const LEGACY_NORDIC_SKY = ['#4F8FB8', '#D9EAF5', '#A8C9DC', '#3A6F92', '#7EB7D6'] as const;

describe('Brandbook tokens (UX/UI v2 · A · 50/35/15)', () => {
  it('product accent family has no calm.* keys', () => {
    const lightKeys = Object.keys(LIGHT_CLARO_TOKENS);
    const darkKeys = Object.keys(DARK_CLARO_TOKENS);
    expect(lightKeys.some((k) => k.startsWith('calm'))).toBe(false);
    expect(darkKeys.some((k) => k.startsWith('calm'))).toBe(false);
    expect(LIGHT_CLARO_TOKENS.accent).toBe('#7DCD72');
    expect(LIGHT_CLARO_TOKENS.accentLight).toBe('#E5F6E2');
    expect(LIGHT_CLARO_TOKENS.accentMid).toBe('#7DCD72');
  });

  it('maps green recognition, petrol info, green wash', () => {
    expect(LIGHT_CLARO_TOKENS.tipBg).toBe(LIGHT_CLARO_TOKENS.accentLight);
    expect(LIGHT_CLARO_TOKENS.tipBorder).toBe(LIGHT_CLARO_TOKENS.accent);
    expect(LIGHT_CLARO_TOKENS.tipText).toBe('#004F70');
    expect(LIGHT_CLARO_TOKENS.info).toBe('#006F83');
    expect(LIGHT_CLARO_TOKENS.infoLight).toBe('#D5EEF2');
  });

  it('dark accent stays recognition green; info is petrol tint', () => {
    expect(DARK_CLARO_TOKENS.accent).toBe('#7DCD72');
    expect(DARK_CLARO_TOKENS.info).toBe('#7EBFD0');
    expect(DARK_CLARO_TOKENS.tipBg).toBe(DARK_CLARO_TOKENS.accentLight);
  });

  it('rejects legacy Dual Calm medical blue hexes', () => {
    const values = [...Object.values(LIGHT_CLARO_TOKENS), ...Object.values(DARK_CLARO_TOKENS)];
    for (const hex of LEGACY_MEDICAL_BLUE) {
      expect(values).not.toContain(hex);
    }
  });

  it('rejects retired Nordic Air sky hexes in product tokens', () => {
    const values = [...Object.values(LIGHT_CLARO_TOKENS), ...Object.values(DARK_CLARO_TOKENS)];
    for (const hex of LEGACY_NORDIC_SKY) {
      expect(values).not.toContain(hex);
    }
  });

  it('returns petrol-to-green gradient stops for light and dark', () => {
    const light = getClaroGradient(false);
    expect(light.colors).toEqual(['#004F70', '#006F83', '#7DCD72']);

    const dark = getClaroGradient(true);
    expect(dark.colors).toEqual(['#0A2F3C', '#006F83', '#7DCD72']);

    const banned = new Set(
      [...LEGACY_MEDICAL_BLUE, ...LEGACY_NORDIC_SKY].map((h) => h.toUpperCase()),
    );
    for (const stop of [...light.colors, ...dark.colors]) {
      expect(banned.has(stop.toUpperCase())).toBe(false);
    }
  });
});
