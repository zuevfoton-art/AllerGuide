import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Platform } from 'react-native';
import { logCaughtError } from '@/src/services/error-reporting';
import { useAppearanceStore } from '@/src/store/appearance-store';

async function shouldSkipHaptics(): Promise<boolean> {
  if (useAppearanceStore.getState().preferCalmMotion) return true;
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

/** No-op on web — haptics require native hardware. */
async function run(fn: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
  if (await shouldSkipHaptics()) return;
  try {
    await fn();
  } catch (error) {
    logCaughtError('haptics', error, { level: 'warn' });
  }
}

/** Strong feedback for allergen danger verdicts. */
export function hapticDanger(): Promise<void> {
  return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Positive feedback for successful save actions. */
export function hapticSuccess(): Promise<void> {
  return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Light tap for destructive / dismiss actions. */
export function hapticLight(): Promise<void> {
  return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
