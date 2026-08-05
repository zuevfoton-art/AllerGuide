import { Platform } from 'react-native';

/** Breathing room between chrome controls and the safe-area edge. */
const CHROME_GAP = 12;

/**
 * Android 3-button navigation is typically ~48dp. Fullscreen camera Modals with
 * `statusBarTranslucent` (and often `navigationBarTranslucent`) draw under the
 * system nav while `useSafeAreaInsets().bottom` stays 0 when the host activity
 * is not edge-to-edge — so chrome needs a hard floor.
 */
const ANDROID_NAV_FLOOR = 48;

/** Status-bar floor when Modal translucent insets report 0 on Android. */
const ANDROID_STATUS_FLOOR = 28;

/** Bottom padding for shutter / gallery row in fullscreen camera chrome. */
export function resolveCameraChromePaddingBottom(insetsBottom: number): number {
  if (Platform.OS === 'ios') return Math.max(insetsBottom, 16) + CHROME_GAP;
  if (Platform.OS === 'web') return CHROME_GAP + 8;
  return Math.max(insetsBottom, ANDROID_NAV_FLOOR) + CHROME_GAP;
}

/** Top padding for flash / title / close row in fullscreen camera chrome. */
export function resolveCameraChromePaddingTop(insetsTop: number): number {
  if (Platform.OS === 'ios') return Math.max(insetsTop, 12) + 8;
  if (Platform.OS === 'web') return 24;
  return Math.max(insetsTop, ANDROID_STATUS_FLOOR) + 8;
}
