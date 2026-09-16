import { Platform } from 'react-native';

import { getClaroGradient, type ClaroGradient } from '@/src/constants/claro-gradient';

export type { ClaroGradient };
export { getClaroGradient };

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Nordic Air (warm sky) design tokens — UX/UI v2 production palette B.
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
  focusRing: string;
  skeletonBase: string;
  skeletonSheen: string;
  /** Map canvas stand-in while tiles load (land fill). */
  mapLand: string;
  /** Map canvas stand-in stroke / road. */
  mapRoad: string;
};

export const lightColors: ThemeColors = {
  bg: '#F5F3EE',
  card: '#FFFCF8',
  accent: '#4F8FB8',
  accentLight: '#D9EAF5',
  accentMid: '#A8C9DC',
  head: '#1A3038',
  text: '#1C2624',
  textSecondary: '#5A6B72',
  textMuted: '#5A6B72',
  border: '#E2DDD4',
  borderInput: '#C9C4BA',
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
  forest: '#1A3038',
  green: '#15803D',
  mint: '#EDE9E2',
  foam: '#F3EDE4',
  cream: '#F5F3EE',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#6366F1',
  pink: '#E11D48',
  tipBg: '#D9EAF5',
  tipBorder: '#A8C9DC',
  tipText: '#3A6F92',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#BBF7D0',
  scannerDangerBorder: '#FECACA',
  scannerSafeIconBg: '#F0FDF4',
  scannerDangerIconBg: '#FEF2F2',
  scannerSafeText: '#15803D',
  overlay: '#1C2624',
  teal: '#4F8FB8',
  tealLight: '#D9EAF5',
  surfaceMuted: '#F3EDE4',
  info: '#4F8FB8',
  infoLight: '#D9EAF5',
  focusRing: 'rgba(79,143,184,0.35)',
  skeletonBase: '#E8E2D8',
  skeletonSheen: '#F7F3EC',
  mapLand: '#E8E2D8',
  mapRoad: '#D0C9BE',
};

export const darkColors: ThemeColors = {
  bg: '#121614',
  card: '#1A2220',
  accent: '#7EB7D6',
  accentLight: '#243846',
  accentMid: '#4F8FB8',
  head: '#E8F0ED',
  text: '#E8F0ED',
  textSecondary: '#9BB0A8',
  textMuted: '#9BB0A8',
  border: '#2A3531',
  borderInput: '#3A4842',
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
  forest: '#E8F0ED',
  green: '#4ADE80',
  mint: '#1A2420',
  foam: '#1A2420',
  cream: '#121614',
  onAccent: '#0A1214',
  onDanger: '#FFFFFF',
  purple: '#818CF8',
  pink: '#FB7185',
  tipBg: '#243846',
  tipBorder: '#4F8FB8',
  tipText: '#A8C9DC',
  iconOnCard: '#0A1214',
  scannerSafeBorder: '#166534',
  scannerDangerBorder: '#991B1B',
  scannerSafeIconBg: '#14532D',
  scannerDangerIconBg: '#450A0A',
  scannerSafeText: '#4ADE80',
  overlay: '#000000',
  teal: '#7EB7D6',
  tealLight: '#243846',
  surfaceMuted: '#1A2420',
  info: '#7EB7D6',
  infoLight: '#243846',
  focusRing: 'rgba(126,183,214,0.45)',
  skeletonBase: '#1A2420',
  skeletonSheen: '#24302B',
  mapLand: '#1A2420',
  mapRoad: '#2A3531',
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
