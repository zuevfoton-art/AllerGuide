import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = {
  bg: string;
  card: string;
  accent: string;
  accentLight: string;
  accentMid: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
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
  forest: string;
  green: string;
  mint: string;
  foam: string;
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
  teal: string;
  tealLight: string;
  surfaceMuted: string;
};

export const lightColors: ThemeColors = {
  bg: '#F4F8F6',
  card: '#FFFFFF',
  accent: '#FF6B00',
  accentLight: '#FFF6F0',
  accentMid: '#FFD4B0',
  text: '#1A1F1C',
  textSecondary: '#5C6560',
  textMuted: '#9AA39E',
  border: 'rgba(31, 77, 58, 0.08)',
  success: '#2EC4A0',
  successLight: '#E8F9F3',
  successBorder: '#B8EAD8',
  danger: '#FF3B30',
  dangerLight: '#FFF0EF',
  dangerBorder: '#FFD0CD',
  warning: '#FF9500',
  warningLight: '#FFF8EE',
  warningBorder: '#FFE5B8',
  warningText: '#8A6600',
  forest: '#1F4D3A',
  green: '#4D8B68',
  mint: '#D4F0E4',
  foam: '#EDF7F2',
  cream: '#FAFCFB',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#6B68E8',
  pink: '#FF5E78',
  tipBg: '#F3F2FF',
  tipBorder: '#D8D6F5',
  tipText: '#4A47A8',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#B8EAD8',
  scannerDangerBorder: '#FFD0CD',
  scannerSafeIconBg: '#D4F0E4',
  scannerDangerIconBg: '#FFE5E3',
  scannerSafeText: '#1A7A3C',
  overlay: '#1F4D3A',
  teal: '#2EC4A0',
  tealLight: '#E8F9F3',
  surfaceMuted: '#EEF3F0',
};

export const darkColors: ThemeColors = {
  bg: '#000000',
  card: '#1C1C1E',
  accent: '#FF8A3D',
  accentLight: '#2A1608',
  accentMid: '#4A280F',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  border: '#38383A',
  success: '#30D158',
  successLight: '#102817',
  successBorder: '#1F5C34',
  danger: '#FF453A',
  dangerLight: '#2A1210',
  dangerBorder: '#5C201C',
  warning: '#FF9F0A',
  warningLight: '#2A1F08',
  warningBorder: '#5C450F',
  warningText: '#FFD68A',
  forest: '#7FD4A8',
  green: '#8BC4A4',
  mint: '#1A2E24',
  foam: '#142018',
  cream: '#000000',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  purple: '#7C7AFF',
  pink: '#FF5E78',
  tipBg: '#1E1B33',
  tipBorder: '#3A3566',
  tipText: '#B8B4FF',
  iconOnCard: '#FFFFFF',
  scannerSafeBorder: '#1F5C34',
  scannerDangerBorder: '#5C201C',
  scannerSafeIconBg: '#163422',
  scannerDangerIconBg: '#3A1512',
  scannerSafeText: '#7FD4A8',
  overlay: '#000000',
  teal: '#3DDBB5',
  tealLight: '#123328',
  surfaceMuted: '#1C2420',
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
    xs: makeShadow(shadowBase, 1, 4, 0.18, 1),
    sm: makeShadow(shadowBase, 2, 8, 0.22, 2),
    md: makeShadow(shadowBase, 2, 8, 0.24, 2),
    glass: makeShadow(shadowBase, 8, 24, 0.06, 3),
    accent: makeShadow(colors.accent, 4, 10, 0.35, 4),
    accentLg: makeShadow(colors.accent, 8, 16, 0.4, 8),
    danger: makeShadow(colors.danger, 6, 12, 0.4, 6),
  };
}

/** @deprecated Use useTheme() instead */
export const colors = lightColors;

/** @deprecated Use useTheme() instead */
export const shadows = createShadows(lightColors);
