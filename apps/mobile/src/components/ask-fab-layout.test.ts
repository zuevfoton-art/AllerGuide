import { describe, expect, it } from 'vitest';
import { density, space } from '@/src/constants/layout';
import { askFabBottomOffset, shouldRaiseAskFabForScreenFab } from './ask-fab-layout';

describe('shouldRaiseAskFabForScreenFab', () => {
  it('raises Ask on diary where the screen-level + FAB lives', () => {
    expect(shouldRaiseAskFabForScreenFab('/diary')).toBe(true);
    expect(shouldRaiseAskFabForScreenFab('/diary/edit')).toBe(true);
  });

  it('does not raise on other Ask surfaces', () => {
    expect(shouldRaiseAskFabForScreenFab('/home')).toBe(false);
    expect(shouldRaiseAskFabForScreenFab('/scanner')).toBe(false);
    expect(shouldRaiseAskFabForScreenFab('/map')).toBe(false);
    expect(shouldRaiseAskFabForScreenFab('/sos')).toBe(false);
    expect(shouldRaiseAskFabForScreenFab(null)).toBe(false);
  });
});

describe('askFabBottomOffset', () => {
  const tabBarHeight = 68;

  it('uses the default tab offset outside diary', () => {
    expect(
      askFabBottomOffset({
        pathname: '/home',
        inTabs: true,
        tabBarHeight,
        safeBottom: 0,
      }),
    ).toBe(tabBarHeight + space[3]);
  });

  it('stacks Ask above the diary FAB by one FAB row + gap', () => {
    expect(
      askFabBottomOffset({
        pathname: '/diary',
        inTabs: true,
        tabBarHeight,
        safeBottom: 0,
      }),
    ).toBe(tabBarHeight + space[3] + density.tapMinHeightFab + space[3] + space[2]);
  });

  it('keeps stack-route padding when not in tabs', () => {
    expect(
      askFabBottomOffset({
        pathname: '/market',
        inTabs: false,
        tabBarHeight,
        safeBottom: 20,
      }),
    ).toBe(Math.max(20, space[3]) + space[4]);
  });
});
