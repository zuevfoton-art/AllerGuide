import { Platform } from 'react-native';

export const colors = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  accent: '#FF6B00',
  accentLight: '#FFF3EA',
  accentMid: '#FFD4B0',
  text: '#1C1C1E',
  textSecondary: '#636366',
  textMuted: '#AEAEB2',
  border: '#E5E5EA',
  success: '#34C759',
  successLight: '#E8F9ED',
  danger: '#FF3B30',
  dangerLight: '#FFEBEA',
  warning: '#FF9500',
  forest: '#1F4D3A',
  green: '#4D8B68',
  mint: '#CBE9D8',
  foam: '#E8F6EE',
  cream: '#F2F2F7',
};

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

export const shadows = {
  none: Platform.OS === 'web'
    ? { boxShadow: 'none' }
    : { shadowOpacity: 0, elevation: 0 },
  xs:   makeShadow('#000000', 1, 4,  0.05, 1),
  sm:   makeShadow('#000000', 2, 8,  0.07, 2),
  md:   makeShadow('#000000', 2, 8,  0.06, 2),
  accent:   makeShadow(colors.accent,  4, 10, 0.30, 4),
  accentLg: makeShadow(colors.accent,  8, 16, 0.35, 8),
  danger:   makeShadow(colors.danger,  6, 12, 0.35, 6),
};
