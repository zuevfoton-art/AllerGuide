/** Forest Refuge / Earth Wellness gradient + mirror tokens — no RN deps (testable in Vitest). */

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
      colors: ['#14140F', '#2C333A', '#9AADB8'],
      locations: [0, 0.55, 1],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    };
  }
  return {
    colors: ['#3F4F55', '#5F7076', '#E0E5E7'],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
}

/**
 * Light-mode Earth Wellness tokens (mirror theme.ts) — choice 2B.
 * Primary CTA = deepened Photo-3 Slate (`#5F7076`; brand swatch `#829399`).
 * Sage/Moss = soft surfaces; dusty rose lives on surfaceMuted/foam in theme.ts.
 */
export const LIGHT_CLARO_TOKENS = {
  tipText: '#5F5F4A',
  info: '#5F7076',
  infoLight: '#E0E5E7',
  tipBg: '#E4E5D4',
  tipBorder: '#A3A380',
  accent: '#5F7076',
  accentLight: '#E4E5D4',
  accentMid: '#A3A380',
} as const;

/** Dark-mode Earth Wellness tokens (mirror theme.ts) — Slate primary */
export const DARK_CLARO_TOKENS = {
  tipText: '#C5C5A8',
  info: '#9AADB8',
  infoLight: '#2C333A',
  tipBg: '#2A2A22',
  tipBorder: '#A3A380',
  accent: '#9AADB8',
  accentLight: '#2A2A22',
  accentMid: '#7F7F67',
} as const;
