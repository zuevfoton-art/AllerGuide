/** Claro teal/sage gradient + mirror tokens — no RN deps (testable in Vitest). */

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
      colors: ['#0B1612', '#1A2E28', '#5B8C7A'],
      locations: [0, 0.55, 1],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    };
  }
  return {
    colors: ['#3D6B5C', '#5B8C7A', '#B8CFC4'],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
}

/** Light-mode Claro tokens (mirror theme.ts) — Figma screen-dashboard sage family */
export const LIGHT_CLARO_TOKENS = {
  tipText: '#3D6B5C',
  info: '#5B8C7A',
  infoLight: '#EAF2EA',
  tipBg: '#EAF2EA',
  tipBorder: '#B8CFC4',
  accent: '#5B8C7A',
  accentLight: '#EAF2EA',
  accentMid: '#B8CFC4',
} as const;

/** Dark-mode Claro tokens (mirror theme.ts) */
export const DARK_CLARO_TOKENS = {
  tipText: '#B8CFC4',
  info: '#7BAF9A',
  infoLight: '#1A2E28',
  tipBg: '#1A2E28',
  tipBorder: '#5B8C7A',
  accent: '#7BAF9A',
  accentLight: '#1A2E28',
  accentMid: '#5B8C7A',
} as const;
