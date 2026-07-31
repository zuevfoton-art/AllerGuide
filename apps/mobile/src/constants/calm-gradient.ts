/** Claro teal ambient gradient — no RN deps (testable in Vitest). */

export type CalmGradient = {
  colors: readonly [string, string, string];
  locations: readonly [number, number, number];
  /** Unit coords for expo-linear-gradient */
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export function getCalmGradient(isDark: boolean): CalmGradient {
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

/** Light-mode Claro ambient tokens (mirror theme.ts) — no medical blue */
export const LIGHT_CALM_TOKENS = {
  calmDeep: '#1F6B62',
  calmMid: '#2A9D8F',
  calmLight: '#9FD9D1',
  calmWash: '#E6F6F4',
  calmMist: '#9FD9D1',
  info: '#2A9D8F',
  infoLight: '#E6F6F4',
  tipBg: '#E6F6F4',
  tipBorder: '#9FD9D1',
  tipText: '#1F6B62',
  accent: '#2A9D8F',
  accentLight: '#E6F6F4',
  accentMid: '#9FD9D1',
} as const;

/** Dark-mode Claro ambient tokens (mirror theme.ts) */
export const DARK_CALM_TOKENS = {
  calmDeep: '#0B1120',
  calmMid: '#3DB8A8',
  calmLight: '#3DB8A8',
  calmWash: '#134E48',
  calmMist: '#2A9D8F',
  info: '#3DB8A8',
  infoLight: '#134E48',
  tipBg: '#134E48',
  tipBorder: '#2A9D8F',
  tipText: '#9FD9D1',
  accent: '#3DB8A8',
  accentLight: '#134E48',
  accentMid: '#2A9D8F',
} as const;
