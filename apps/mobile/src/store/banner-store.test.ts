import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANNER_AUTO_HIDE_MS, showStatusBanner, useBannerStore } from './banner-store';

describe('banner-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useBannerStore.getState().hide();
  });

  afterEach(() => {
    useBannerStore.getState().hide();
    vi.useRealTimers();
  });

  it('keeps the snackbar visible long enough for Maestro to match the success copy', () => {
    expect(BANNER_AUTO_HIDE_MS).toBeGreaterThanOrEqual(8_000);
    showStatusBanner({ tone: 'success', message: 'Резервная копия отправлена на сервер.' });
    expect(useBannerStore.getState().banner?.message).toBe('Резервная копия отправлена на сервер.');

    vi.advanceTimersByTime(BANNER_AUTO_HIDE_MS - 1);
    expect(useBannerStore.getState().banner?.message).toBe('Резервная копия отправлена на сервер.');

    vi.advanceTimersByTime(1);
    expect(useBannerStore.getState().banner).toBeNull();
  });
});
