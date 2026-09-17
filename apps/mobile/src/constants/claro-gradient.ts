/** Claro teal gradient + mirror tokens — no RN deps (testable in Vitest). */

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
      colors: ['#0B1120', '#134E48', '#2A9D8F'],
      locations: [0, 0.55, 1],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    };
  }
  return {
    colors: ['#1F6B62', '#2A9D8F', '#9FD9D1'],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
}

/** Light-mode Claro tokens (mirror theme.ts) — no medical blue, no calm.* keys */
export const LIGHT_CLARO_TOKENS = {
  tipText: '#1F6B62',
  info: '#2A9D8F',
  infoLight: '#E6F6F4',
  tipBg: '#E6F6F4',
  tipBorder: '#9FD9D1',
  accent: '#2A9D8F',
  accentLight: '#E6F6F4',
  accentMid: '#9FD9D1',
} as const;

/** Dark-mode Claro tokens (mirror theme.ts) */
export const DARK_CLARO_TOKENS = {
  tipText: '#9FD9D1',
  info: '#3DB8A8',
  infoLight: '#134E48',
  tipBg: '#134E48',
  tipBorder: '#2A9D8F',
  accent: '#3DB8A8',
  accentLight: '#134E48',
  accentMid: '#2A9D8F',
} as const;
