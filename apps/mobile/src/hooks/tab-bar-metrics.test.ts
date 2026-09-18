import { afterEach, describe, expect, it, vi } from 'vitest';

describe('tab-bar-metrics', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react-native');
  });

  it('pads Android tab bar by system navigation inset', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
    }));
    const { resolveTabBarPaddingBottom, resolveTabBarHeight } = await import('./tab-bar-metrics');

    expect(resolveTabBarPaddingBottom(0)).toBe(6);
    expect(resolveTabBarPaddingBottom(48)).toBe(48);
    expect(resolveTabBarHeight(48, false)).toBe(52 + 48);
  });

  it('keeps iOS home-indicator floor at zip 34', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
    const { resolveTabBarPaddingBottom, resolveTabBarHeight } = await import('./tab-bar-metrics');

    expect(resolveTabBarPaddingBottom(0)).toBe(34);
    expect(resolveTabBarPaddingBottom(34)).toBe(34);
    expect(resolveTabBarHeight(34, false)).toBe(52 + 34);
  });
});
