import { Platform, useWindowDimensions, type DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COMPACT_BREAKPOINT,
  MOBILE_WEB_MAX_WIDTH,
  TABLET_BREAKPOINT,
  TABLET_WEB_MAX_WIDTH,
  WEB_TAB_BAR_HEIGHT,
} from '@/src/constants/layout';
import { resolveTabBarHeight, resolveTabBarPaddingBottom } from '@/src/hooks/tab-bar-metrics';

export { resolveTabBarHeight, resolveTabBarPaddingBottom } from '@/src/hooks/tab-bar-metrics';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isCompact = width < COMPACT_BREAKPOINT;
  const isTabletUp = width >= TABLET_BREAKPOINT;

  const shellMaxWidth = isWeb
    ? width >= TABLET_BREAKPOINT
      ? TABLET_WEB_MAX_WIDTH
      : MOBILE_WEB_MAX_WIDTH
    : undefined;

  const contentMaxWidth = isWeb ? shellMaxWidth : undefined;
  const horizontalPadding = isCompact ? 14 : isWeb ? 16 : 20;
  const topPadding = isWeb ? 16 : 56;
  const tabBarHeight = resolveTabBarHeight(insets.bottom, isWeb);
  const tabBarPaddingBottom = resolveTabBarPaddingBottom(insets.bottom);
  // Clear the absolute tab bar (+ a little air) so scroll content is tappable.
  const bottomPadding = isWeb ? WEB_TAB_BAR_HEIGHT + 24 : tabBarHeight + 16;
  const gridColumns = isCompact ? 1 : width >= 640 ? 3 : 2;
  const gridGap = 12;
  const showTabLabels = !isCompact || width >= 340;

  const gridCardWidth: DimensionValue =
    gridColumns === 1 ? '100%' : gridColumns === 2 ? '47%' : '31%';

  return {
    width,
    height,
    isWeb,
    isCompact,
    isTabletUp,
    isMobileWeb: isWeb && !isTabletUp,
    shellMaxWidth,
    contentMaxWidth,
    horizontalPadding,
    topPadding,
    bottomPadding,
    gridColumns,
    gridGap,
    gridCardWidth,
    showTabLabels,
    tabBarHeight,
    tabBarPaddingBottom,
  };
}
