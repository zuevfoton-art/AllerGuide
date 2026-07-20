import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { logCaughtError } from '@/src/services/error-reporting';

/** No-op on web — haptics require native hardware. */
async function run(fn: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
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
