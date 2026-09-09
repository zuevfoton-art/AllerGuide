import { Easing } from 'react-native';

/** Shared motion tokens — calm ease-out, no springs or flicker. */
export const duration = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
} as const;

export const easing = {
  calm: Easing.out(Easing.cubic),
} as const;

export const SKELETON_CYCLE_MS = 650;
export const POLLEN_PLUME_FRAME_MS = 80;

export const pressedOpacity = 0.88;
export const disabledOpacity = 0.55;

export function resolveModalAnimation(
  type: 'slide' | 'fade',
  reduced: boolean,
): 'none' | 'slide' | 'fade' {
  return reduced ? 'none' : type;
}
