import { Platform } from 'react-native';

import { getClaroGradient, type ClaroGradient } from '@/src/constants/claro-gradient';

export type { ClaroGradient };
export { getClaroGradient };

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Claro Green design tokens — product accent family only (no medical blue / calm.*).
 * Keep hex values in sync with LIGHT_CLARO_TOKENS / DARK_CLARO_TOKENS in claro-gradient.ts.
 * Policy: docs/brand-claro-green.md
 * Light palette is 1:1 with Figma Make zip (`code.txt`) for screens-flow-map.
 * `caution*` — moderate diary severity (level 2); not part of Claro CTA family.
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
  /** Moderate severity (diary 0–3 level 2) */
  caution: string;
  cautionLight: string;
  cautionBorder: string;
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
  /** Zip `surfaceDark` — scanner cam fill / inactive dots */
  surfaceDark: string;
  info: string;
  infoLight: string;
  focusRing: string;
  skeletonBase: string;
  skeletonSheen: string;
  /** Map canvas stand-in while tiles load (land fill). */
  mapLand: string;
  /** Map canvas stand-in stroke / road. */
  mapRoad: string;
  /** Zip dashboard outer ring / allergen axis */
  ringAllergen: string;
  /** Zip dashboard mid ring / medicine axis */
  ringMedicine: string;
  severitySafe: string;
  severityMild: string;
  severityModerate: string;
  severitySevere: string;
  severitySafeBg: string;
  severityMildBg: string;
  severityModerateBg: string;
  severitySevereBg: string;
};

export const lightColors: ThemeColors = {
  bg: '#FDFBF9',
  card: '#FFFFFF',
  accent: '#5B8C7A',
  accentLight: '#EAF2EA',
  accentMid: '#B8CFC4',
  head: '#2C3531',
  text: '#2C3531',
  /** Figma Make zip `textSecondary` — AA exception, do not nudge to #5F716B */
  textSecondary: '#6B7C75',
  textMuted: '#6B7C75',
  border: '#E2E8F0',
  borderInput: '#CBD5E1',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  danger: '#E53E3E',
  dangerLight: '#FED7D7',
  dangerBorder: '#FECACA',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',
  warningText: '#B45309',
  caution: '#F97316',
  cautionLight: '#FFFBEB',
  cautionBorder: '#FDE68A',
  forest: '#2C3531',
  /** Text on successLight (calm zone) — darker than Figma ring fill `#10B981` for AA */
  green: '#047857',
  mint: '#EAF2EA',
  foam: '#EAF2EA',
  cream: '#FDFBF9',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#5D5FEF',
  pink: '#E11D48',
  tipBg: '#EAF2EA',
  tipBorder: '#B8CFC4',
  tipText: '#3D6B5C',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#A7F3D0',
  scannerDangerBorder: '#FECACA',
  scannerSafeIconBg: '#ECFDF5',
  scannerDangerIconBg: '#FED7D7',
  scannerSafeText: '#047857',
  overlay: '#2C3531',
  teal: '#5B8C7A',
  tealLight: '#EAF2EA',
  surfaceMuted: '#EAF2EA',
  surfaceDark: '#D1DED1',
  info: '#5B8C7A',
  infoLight: '#EAF2EA',
  focusRing: 'rgba(91,140,122,0.35)',
  skeletonBase: '#EAF2EA',
  skeletonSheen: '#F7F5F2',
  mapLand: '#EAF2EA',
  mapRoad: '#C5D0C8',
  ringAllergen: '#EF4444',
  ringMedicine: '#F59E0B',
  severitySafe: '#10B981',
  severityMild: '#F59E0B',
  severityModerate: '#F97316',
  severitySevere: '#EF4444',
  severitySafeBg: '#D1FAE5',
  severityMildBg: '#FEF3C7',
  severityModerateBg: '#FFEDD5',
  severitySevereBg: '#FED7D7',
};

/** Dark companion — same roles as the zip light palette, not a second zip set. */
export const darkColors: ThemeColors = {
  bg: '#0F1613',
  card: '#161D1A',
  accent: '#7BAF9A',
  accentLight: '#1A2E28',
  accentMid: '#5B8C7A',
  head: '#E8EDE9',
  text: '#F4F7F5',
  textSecondary: '#A8B5AF',
  textMuted: '#8A9892',
  border: '#2C3A35',
  borderInput: '#475569',
  success: '#34D399',
  successLight: '#064E3B',
  successBorder: '#065F46',
  danger: '#F87171',
  dangerLight: '#450A0A',
  dangerBorder: '#991B1B',
  warning: '#FBBF24',
  warningLight: '#451A03',
  warningBorder: '#92400E',
  warningText: '#FDE68A',
  caution: '#FB923C',
  cautionLight: '#431407',
  cautionBorder: '#9A3412',
  forest: '#E8EDE9',
  green: '#34D399',
  mint: '#1A2420',
  foam: '#1A2420',
  cream: '#0F1613',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#818CF8',
  pink: '#FB7185',
  tipBg: '#1A2E28',
  tipBorder: '#5B8C7A',
  tipText: '#B8CFC4',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#065F46',
  scannerDangerBorder: '#991B1B',
  scannerSafeIconBg: '#064E3B',
  scannerDangerIconBg: '#450A0A',
  scannerSafeText: '#34D399',
  overlay: '#000000',
  teal: '#7BAF9A',
  tealLight: '#1A2E28',
  surfaceMuted: '#1A2420',
  surfaceDark: '#24302B',
  info: '#7BAF9A',
  infoLight: '#1A2E28',
  focusRing: 'rgba(123,175,154,0.45)',
  skeletonBase: '#1A2420',
  skeletonSheen: '#24302B',
  mapLand: '#1A2420',
  mapRoad: '#2C3A35',
  ringAllergen: '#F87171',
  ringMedicine: '#FBBF24',
  severitySafe: '#34D399',
  severityMild: '#FBBF24',
  severityModerate: '#FB923C',
  severitySevere: '#F87171',
  severitySafeBg: '#064E3B',
  severityMildBg: '#451A03',
  severityModerateBg: '#431407',
  severitySevereBg: '#450A0A',
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
    /** Dark drop shadow for raised ACTION controls. */
    raised: makeShadow(shadowBase, 3, 6, 0.22, 5),
    raisedStrong: makeShadow(shadowBase, 5, 12, 0.28, 8),
    accent: makeShadow(colors.accent, 2, 6, 0.2, 3),
    accentLg: makeShadow(colors.accent, 4, 10, 0.25, 4),
    danger: makeShadow(colors.danger, 4, 8, 0.25, 4),
  };
}
