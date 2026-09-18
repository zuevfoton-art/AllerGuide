import { Platform } from 'react-native';
import { WEB_TAB_BAR_HEIGHT } from '@/src/constants/layout';

const TAB_ROW_HEIGHT = 52;
const HOME_INDICATOR_HEIGHT = 34;

/** Bottom padding inside the absolute tab bar (above system nav / home indicator). */
export function resolveTabBarPaddingBottom(insetsBottom: number): number {
  if (Platform.OS === 'ios') return Math.max(insetsBottom, HOME_INDICATOR_HEIGHT);
  if (Platform.OS === 'web') return HOME_INDICATOR_HEIGHT;
  // Android: keep a small gap above the gesture/3-button nav when insets apply
  // (SDK 54+ / API 35 often draws the app under the system navigation bar).
  return Math.max(insetsBottom, 6);
}

export function resolveTabBarHeight(insetsBottom: number, isWeb: boolean): number {
  if (isWeb) return WEB_TAB_BAR_HEIGHT;
  const pad = resolveTabBarPaddingBottom(insetsBottom);
  return TAB_ROW_HEIGHT + pad;
}
