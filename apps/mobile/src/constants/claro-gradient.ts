/** Nordic Air (warm sky) gradient + mirror tokens — no RN deps (testable in Vitest). */

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
      colors: ['#0E1618', '#243846', '#4F8FB8'],
      locations: [0, 0.55, 1],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    };
  }
  return {
    colors: ['#3A6F92', '#4F8FB8', '#D9EAF5'],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
}

/** Light-mode Nordic Air tokens (mirror theme.ts) — no Dual Calm medical blues */
export const LIGHT_CLARO_TOKENS = {
  tipText: '#3A6F92',
  info: '#4F8FB8',
  infoLight: '#D9EAF5',
  tipBg: '#D9EAF5',
  tipBorder: '#A8C9DC',
  accent: '#4F8FB8',
  accentLight: '#D9EAF5',
  accentMid: '#A8C9DC',
} as const;

/** Dark-mode Nordic Air tokens (mirror theme.ts) */
export const DARK_CLARO_TOKENS = {
  tipText: '#A8C9DC',
  info: '#7EB7D6',
  infoLight: '#243846',
  tipBg: '#243846',
  tipBorder: '#4F8FB8',
  accent: '#7EB7D6',
  accentLight: '#243846',
  accentMid: '#4F8FB8',
} as const;
