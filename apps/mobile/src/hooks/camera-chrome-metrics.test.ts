import { afterEach, describe, expect, it, vi } from 'vitest';

describe('camera-chrome-metrics', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react-native');
  });

  it('floors Android bottom chrome above 3-button nav when insets are 0', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
    }));
    const { resolveCameraChromePaddingBottom, resolveCameraChromePaddingTop } =
      await import('./camera-chrome-metrics');

    expect(resolveCameraChromePaddingBottom(0)).toBe(60);
    expect(resolveCameraChromePaddingBottom(48)).toBe(60);
    expect(resolveCameraChromePaddingBottom(72)).toBe(84);
    expect(resolveCameraChromePaddingTop(0)).toBe(36);
    expect(resolveCameraChromePaddingTop(40)).toBe(48);
  });

  it('keeps iOS home-indicator / notch floors', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
    const { resolveCameraChromePaddingBottom, resolveCameraChromePaddingTop } =
      await import('./camera-chrome-metrics');

    expect(resolveCameraChromePaddingBottom(0)).toBe(28);
    expect(resolveCameraChromePaddingBottom(34)).toBe(46);
    expect(resolveCameraChromePaddingTop(0)).toBe(20);
    expect(resolveCameraChromePaddingTop(47)).toBe(55);
  });
});
