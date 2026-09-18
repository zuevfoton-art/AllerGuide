import { density, space } from '@/src/constants/layout';

/**
 * Screen-level FABs (diary «+») share the bottom-right band with Ask.
 * Raise Ask by one FAB row + gap so both stay tappable.
 */
const SCREEN_FAB_PATHS = ['/diary'] as const;

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function shouldRaiseAskFabForScreenFab(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split('?')[0] || pathname;
  return SCREEN_FAB_PATHS.some((prefix) => matchesPrefix(path, prefix));
}

export function askFabBottomOffset(input: {
  pathname: string | null | undefined;
  inTabs: boolean;
  tabBarHeight: number;
  safeBottom: number;
}): number {
  const base = input.inTabs
    ? input.tabBarHeight + space[3]
    : Math.max(input.safeBottom, space[3]) + space[4];
  if (!shouldRaiseAskFabForScreenFab(input.pathname)) return base;
  // One FAB row + gap so Ask sits clearly above the screen-level «+».
  return base + density.tapMinHeightFab + space[3] + space[2];
}
