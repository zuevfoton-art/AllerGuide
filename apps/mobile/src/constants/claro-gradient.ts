/** Brandbook 50/35/15 gradient + mirror tokens — no RN deps (testable in Vitest). */

export type ClaroGradient = {
  colors: readonly [string, string, string];
  locations: readonly [number, number, number];
  /** Unit coords for expo-linear-gradient */
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export function getClaroGradient(isDark: boolean): ClaroGradient {
  if (isDark) {
    return {
      colors: ['#0A2F3C', '#006F83', '#7FFFD4'],
      locations: [0, 0.55, 1],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    };
  }
  return {
    colors: ['#004F70', '#006F83', '#7FFFD4'],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
}

/**
 * Light-mode brandbook tokens (mirror theme.ts).
 * Recognition mint `#7FFFD4` (50%); petrol info `#006F83` (35%);
 * CTA ink is deep petrol `#004F70` on mint.
 */
export const LIGHT_CLARO_TOKENS = {
  tipText: '#004F70',
  info: '#006F83',
  infoLight: '#D5EEF2',
  tipBg: '#E8FFF8',
  tipBorder: '#7FFFD4',
  accent: '#7FFFD4',
  accentLight: '#E8FFF8',
  accentMid: '#7FFFD4',
} as const;

/** Dark-mode brandbook tokens (mirror theme.ts) — mint primary on petrol canvas */
export const DARK_CLARO_TOKENS = {
  tipText: '#C5E8C0',
  info: '#7EBFD0',
  infoLight: '#143844',
  tipBg: '#143844',
  tipBorder: '#7FFFD4',
  accent: '#7FFFD4',
  accentLight: '#143844',
  accentMid: '#4FA86A',
} as const;
