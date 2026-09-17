import { Platform } from 'react-native';

import { getClaroGradient, type ClaroGradient } from '@/src/constants/claro-gradient';

export type { ClaroGradient };
export { getClaroGradient };

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Brandbook 50 / 35 / 15 — UX/UI v2 Variant A layout + institutional palette.
 * Recognition mint `#7FFFD4` (50%); composition petrol `#006F83` (35%);
 * mix `#004F70` + white (15%); neutral canvas `#F4F8F5`.
 * CTA ink is petrol on mint (white-on-mint fails AA).
 * Keep hex values in sync with LIGHT_CLARO_TOKENS / DARK_CLARO_TOKENS.
 * Policy: docs/brand-claro-green.md
 */
export type ThemeColors = {
  bg: string;
  card: string;
  /** Primary interactive — actions, links, active tabs (recognition mint) */
  accent: string;
  accentLight: string;
  accentMid: string;
  /** Dark text / KPI — petrol ink for contrast (not ambient fill) */
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
  bg: '#F4F8F5',
  card: '#FFFFFF',
  accent: '#7FFFD4',
  accentLight: '#E8FFF8',
  accentMid: '#7FFFD4',
  head: '#004F70',
  text: '#0E3A48',
  textSecondary: '#3A6670',
  textMuted: '#3A6670',
  border: '#C9DDD6',
  borderInput: '#A8C4BC',
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
  forest: '#004F70',
  green: '#15803D',
  mint: '#D7E8E2',
  foam: '#E8F3F0',
  cream: '#F4F8F5',
  onAccent: '#004F70',
  onDanger: '#FFFFFF',
  purple: '#6366F1',
  pink: '#E11D48',
  tipBg: '#E8FFF8',
  tipBorder: '#7FFFD4',
  tipText: '#004F70',
  iconOnCard: '#004F70',
  scannerSafeBorder: '#BBF7D0',
  scannerDangerBorder: '#FECACA',
  scannerSafeIconBg: '#F0FDF4',
  scannerDangerIconBg: '#FEF2F2',
  scannerSafeText: '#15803D',
  overlay: '#0E3A48',
  teal: '#7FFFD4',
  tealLight: '#E8FFF8',
  surfaceMuted: '#E8F3F0',
  info: '#006F83',
  infoLight: '#D5EEF2',
  focusRing: 'rgba(127,255,212,0.35)',
  skeletonBase: '#DCEBE4',
  skeletonSheen: '#F4F8F5',
  mapLand: '#DCEBE4',
  mapRoad: '#C9DDD6',
};

export const darkColors: ThemeColors = {
  bg: '#0A2F3C',
  card: '#0E3A48',
  accent: '#7FFFD4',
  accentLight: '#143844',
  accentMid: '#4FA86A',
  head: '#E8F7F4',
  text: '#E8F7F4',
  textSecondary: '#9EC4CC',
  textMuted: '#9EC4CC',
  border: '#1A4A56',
  borderInput: '#2A5A66',
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
  forest: '#E8F7F4',
  green: '#4ADE80',
  mint: '#143844',
  foam: '#143844',
  cream: '#0A2F3C',
  onAccent: '#0A2F3C',
  onDanger: '#FFFFFF',
  purple: '#818CF8',
  pink: '#FB7185',
  tipBg: '#143844',
  tipBorder: '#7FFFD4',
  tipText: '#C5E8C0',
  iconOnCard: '#0A2F3C',
  scannerSafeBorder: '#166534',
  scannerDangerBorder: '#991B1B',
  scannerSafeIconBg: '#14532D',
  scannerDangerIconBg: '#450A0A',
  scannerSafeText: '#4ADE80',
  overlay: '#000000',
  teal: '#7FFFD4',
  tealLight: '#143844',
  surfaceMuted: '#143844',
  info: '#7EBFD0',
  infoLight: '#143844',
  focusRing: 'rgba(127,255,212,0.45)',
  skeletonBase: '#143844',
  skeletonSheen: '#1A4A56',
  mapLand: '#143844',
  mapRoad: '#1A4A56',
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
    shadowRadius: blur,
    shadowOpacity: opacity,
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
    /** Dark drop shadow for raised ACTION controls (readable on mint/light fills). */
    raised: makeShadow(shadowBase, 3, 6, 0.22, 5),
    raisedStrong: makeShadow(shadowBase, 5, 12, 0.28, 8),
    accent: makeShadow(colors.accent, 2, 6, 0.2, 3),
    accentLg: makeShadow(colors.accent, 4, 10, 0.25, 4),
    danger: makeShadow(colors.danger, 4, 8, 0.25, 4),
  };
}
