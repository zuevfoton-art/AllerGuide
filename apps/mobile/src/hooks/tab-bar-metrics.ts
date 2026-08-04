import { Platform } from 'react-native';
import { WEB_TAB_BAR_HEIGHT } from '@/src/constants/layout';

/** Bottom padding inside the absolute tab bar (above system nav / home indicator). */
export function resolveTabBarPaddingBottom(insetsBottom: number): number {
  if (Platform.OS === 'ios') return Math.max(insetsBottom, 22);
  if (Platform.OS === 'web') return 8;
  // Android: keep a small gap above the gesture/3-button nav when insets apply
  // (SDK 54+ / API 35 often draws the app under the system navigation bar).
  return Math.max(insetsBottom, 6);
}

export function resolveTabBarHeight(insetsBottom: number, isWeb: boolean): number {
  if (isWeb) return WEB_TAB_BAR_HEIGHT;
  const base = Platform.OS === 'ios' ? 84 : 64;
  const basePad = Platform.OS === 'ios' ? 22 : 6;
  const pad = resolveTabBarPaddingBottom(insetsBottom);
  // Grow the bar by the extra inset so icons/labels keep the same visual room.
  return base - basePad + pad;
}
