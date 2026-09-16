import { Platform } from 'react-native';

import { getClaroGradient, type ClaroGradient } from '@/src/constants/claro-gradient';

export type { ClaroGradient };
export { getClaroGradient };

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Forest Refuge · Earth Wellness — UX/UI v2 Variant A layout + photo-3 palette.
 * Primary CTA = deepened olive (Moss); soft wash = Sage; info = Slate; secondary soft = Dusty Rose.
 * Keep hex values in sync with LIGHT_CLARO_TOKENS / DARK_CLARO_TOKENS in claro-gradient.ts.
 * Policy: docs/brand-claro-green.md
 */
export type ThemeColors = {
  bg: string;
  card: string;
  /** Primary interactive — actions, links, active tabs (olive) */
  accent: string;
  accentLight: string;
  accentMid: string;
  /** Dark text / KPI — warm ink for contrast (not ambient fill) */
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
  bg: '#F7ECE1',
  card: '#FFFCF8',
  accent: '#6E6E58',
  accentLight: '#E4E5D4',
  accentMid: '#A3A380',
  head: '#1C1B18',
  text: '#1C2624',
  textSecondary: '#5A5850',
  textMuted: '#5A5850',
  border: '#E2D8CE',
  borderInput: '#C9BDB2',
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
  forest: '#1C1B18',
  green: '#15803D',
  mint: '#D6D2CD',
  foam: '#F3E9E2',
  cream: '#F7ECE1',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#6366F1',
  pink: '#E11D48',
  tipBg: '#E4E5D4',
  tipBorder: '#A3A380',
  tipText: '#5F5F4A',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#BBF7D0',
  scannerDangerBorder: '#FECACA',
  scannerSafeIconBg: '#F0FDF4',
  scannerDangerIconBg: '#FEF2F2',
  scannerSafeText: '#15803D',
  overlay: '#1C2624',
  teal: '#6E6E58',
  tealLight: '#E4E5D4',
  surfaceMuted: '#F3E9E2',
  info: '#829399',
  infoLight: '#E0E5E7',
  focusRing: 'rgba(110,110,88,0.35)',
  skeletonBase: '#E8DFD6',
  skeletonSheen: '#F7ECE1',
  mapLand: '#E8DFD6',
  mapRoad: '#D0C9BE',
};

export const darkColors: ThemeColors = {
  bg: '#14140F',
  card: '#1E1D1A',
  accent: '#A3A380',
  accentLight: '#2A2A22',
  accentMid: '#7F7F67',
  head: '#F3EDE4',
  text: '#F3EDE4',
  textSecondary: '#B0A99E',
  textMuted: '#B0A99E',
  border: '#2E2C28',
  borderInput: '#3F3C36',
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
  forest: '#F3EDE4',
  green: '#4ADE80',
  mint: '#24221E',
  foam: '#24221E',
  cream: '#14140F',
  onAccent: '#14140F',
  onDanger: '#FFFFFF',
  purple: '#818CF8',
  pink: '#FB7185',
  tipBg: '#2A2A22',
  tipBorder: '#A3A380',
  tipText: '#C5C5A8',
  iconOnCard: '#14140F',
  scannerSafeBorder: '#166534',
  scannerDangerBorder: '#991B1B',
  scannerSafeIconBg: '#14532D',
  scannerDangerIconBg: '#450A0A',
  scannerSafeText: '#4ADE80',
  overlay: '#000000',
  teal: '#A3A380',
  tealLight: '#2A2A22',
  surfaceMuted: '#24221E',
  info: '#9AADB8',
  infoLight: '#2C333A',
  focusRing: 'rgba(163,163,128,0.45)',
  skeletonBase: '#24221E',
  skeletonSheen: '#2E2C28',
  mapLand: '#24221E',
  mapRoad: '#2E2C28',
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
    accent: makeShadow(colors.accent, 2, 6, 0.2, 3),
    accentLg: makeShadow(colors.accent, 4, 10, 0.25, 4),
    danger: makeShadow(colors.danger, 4, 8, 0.25, 4),
  };
}
