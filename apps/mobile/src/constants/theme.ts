import { Platform } from 'react-native';

import {
  getClaroGradient,
  getCalmGradient,
  type ClaroGradient,
  type CalmGradient,
} from '@/src/constants/claro-gradient';

export type { ClaroGradient, CalmGradient };
export { getClaroGradient, getCalmGradient };

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Claro Green design tokens — product accent family only (no medical blue / calm.*).
 * Keep hex values in sync with LIGHT_CLARO_TOKENS / DARK_CLARO_TOKENS in claro-gradient.ts.
 * Policy: docs/brand-claro-green.md
 */
export type ThemeColors = {
  bg: string;
  card: string;
  /** Primary interactive — actions, links, active tabs (Claro teal) */
  accent: string;
  accentLight: string;
  accentMid: string;
  /** Dark text / KPI — navy for contrast (not ambient fill) */
  head: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderInput: string;
  success: string;
  successLight: string;
  successBorder: string;
  danger: string;
  dangerLight: string;
  dangerBorder: string;
  warning: string;
  warningLight: string;
  warningBorder: string;
  warningText: string;
  /** @deprecated use head */
  forest: string;
  green: string;
  /** Segment / subtle track */
  mint: string;
  foam: string;
  /** Screen background — same as bg */
  cream: string;
  onAccent: string;
  onDanger: string;
  purple: string;
  pink: string;
  tipBg: string;
  tipBorder: string;
  tipText: string;
  iconOnCard: string;
  scannerSafeBorder: string;
  scannerDangerBorder: string;
  scannerSafeIconBg: string;
  scannerDangerIconBg: string;
  scannerSafeText: string;
  overlay: string;
  /** @deprecated alias for accent — kept for gradual migration */
  teal: string;
  /** @deprecated alias for accentLight */
  tealLight: string;
  surfaceMuted: string;
  info: string;
  infoLight: string;
};

export const lightColors: ThemeColors = {
  bg: '#F4F6F9',
  card: '#FFFFFF',
  accent: '#2A9D8F',
  accentLight: '#E6F6F4',
  accentMid: '#9FD9D1',
  head: '#1E3A5F',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#5E6B7C',
  border: '#E2E8F0',
  borderInput: '#CBD5E1',
  success: '#15803D',
  successLight: '#F0FDF4',
  successBorder: '#BBF7D0',
  danger: '#B91C1C',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
  warning: '#B45309',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  forest: '#1E3A5F',
  green: '#15803D',
  mint: '#E8ECF1',
  foam: '#F1F5F9',
  cream: '#F4F6F9',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#6366F1',
  pink: '#E11D48',
  tipBg: '#E6F6F4',
  tipBorder: '#9FD9D1',
  tipText: '#1F6B62',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#BBF7D0',
  scannerDangerBorder: '#FECACA',
  scannerSafeIconBg: '#F0FDF4',
  scannerDangerIconBg: '#FEF2F2',
  scannerSafeText: '#15803D',
  overlay: '#0F172A',
  teal: '#2A9D8F',
  tealLight: '#E6F6F4',
  surfaceMuted: '#F1F5F9',
  info: '#2A9D8F',
  infoLight: '#E6F6F4',
};

export const darkColors: ThemeColors = {
  bg: '#0B1120',
  card: '#151D2E',
  accent: '#3DB8A8',
  accentLight: '#134E48',
  accentMid: '#2A9D8F',
  head: '#E2E8F0',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#334155',
  borderInput: '#475569',
  success: '#4ADE80',
  successLight: '#14532D',
  successBorder: '#166534',
  danger: '#F87171',
  dangerLight: '#450A0A',
  dangerBorder: '#991B1B',
  warning: '#FBBF24',
  warningLight: '#451A03',
  warningBorder: '#92400E',
  warningText: '#FDE68A',
  forest: '#E2E8F0',
  green: '#4ADE80',
  mint: '#1E293B',
  foam: '#1E293B',
  cream: '#0B1120',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#818CF8',
  pink: '#FB7185',
  tipBg: '#134E48',
  tipBorder: '#2A9D8F',
  tipText: '#9FD9D1',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#166534',
  scannerDangerBorder: '#991B1B',
  scannerSafeIconBg: '#14532D',
  scannerDangerIconBg: '#450A0A',
  scannerSafeText: '#4ADE80',
  overlay: '#000000',
  teal: '#3DB8A8',
  tealLight: '#134E48',
  surfaceMuted: '#1E293B',
  info: '#3DB8A8',
  infoLight: '#134E48',
};

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}

function makeShadow(
  hexColor: string,
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
): object {
  if (Platform.OS === 'web') {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return { boxShadow: `0 ${y}px ${blur}px rgba(${r},${g},${b},${opacity})` };
  }
  return {
    shadowColor: hexColor,
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
}

export function createShadows(colors: ThemeColors) {
  const shadowBase = colors.overlay;
  return {
    none: Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0, elevation: 0 },
    xs: makeShadow(shadowBase, 1, 3, 0.06, 1),
    sm: makeShadow(shadowBase, 1, 3, 0.06, 2),
    md: makeShadow(shadowBase, 2, 8, 0.1, 3),
    /** @deprecated use sm — flat clinical cards */
    glass: makeShadow(shadowBase, 1, 3, 0.06, 2),
    accent: makeShadow(colors.accent, 2, 6, 0.2, 3),
    accentLg: makeShadow(colors.accent, 4, 10, 0.25, 4),
    danger: makeShadow(colors.danger, 4, 8, 0.25, 4),
  };
}

/** @deprecated Use useTheme() instead */
export const colors = lightColors;

/** @deprecated Use useTheme() instead */
export const shadows = createShadows(lightColors);
