/** Medical Calm ambient gradient — no RN deps (testable in Vitest). */

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
      colors: ['#0B1120', '#1E3A5F', '#1D4ED8'],
      locations: [0, 0.55, 1],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    };
  }
  return {
    colors: ['#1E3A5F', '#2563EB', '#3B82F6'],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
}

/** Light-mode Medical Calm ambient tokens (mirror theme.ts) */
export const LIGHT_CALM_TOKENS = {
  calmDeep: '#1E3A5F',
  calmMid: '#2563EB',
  calmLight: '#3B82F6',
  calmWash: '#EFF4FF',
  calmMist: '#DBEAFE',
  info: '#2563EB',
  infoLight: '#EFF4FF',
  accent: '#2A9D8F',
} as const;
