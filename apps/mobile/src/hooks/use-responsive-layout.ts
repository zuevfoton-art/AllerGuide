import { Platform, useWindowDimensions, type DimensionValue } from 'react-native';
import {
  COMPACT_BREAKPOINT,
  MOBILE_WEB_MAX_WIDTH,
  TABLET_BREAKPOINT,
  TABLET_WEB_MAX_WIDTH,
  WEB_TAB_BAR_HEIGHT,
} from '@/src/constants/layout';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
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
  const bottomPadding = isWeb ? WEB_TAB_BAR_HEIGHT + 24 : 32;
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
    tabBarHeight: isWeb ? WEB_TAB_BAR_HEIGHT : Platform.OS === 'ios' ? 84 : 64,
  };
}
