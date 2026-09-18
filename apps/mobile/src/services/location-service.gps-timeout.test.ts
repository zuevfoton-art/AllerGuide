/* eslint-disable import/first -- vitest mocks must be registered before module import */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => store.get(key) ?? '',
  setSetting: (key: string, value: string) => {
    store.set(key, value);
  },
}));

// Native path: web short-circuits to the default region before touching GPS.
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

const getCurrentPositionAsync = vi.fn();

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: (...args: unknown[]) => getCurrentPositionAsync(...args),
  Accuracy: { Balanced: 3 },
}));

import { getCurrentLocation } from './location-service';

describe('location-service GPS deadline', () => {
  beforeEach(() => {
    store.clear();
    getCurrentPositionAsync.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Nightly 35315005471: with permissions granted but no fix available, the
  // Today screen stayed on skeleton cards for the whole run and the first-run
  // hint tour never opened, because the home loader awaited this call.
  it('falls back to the default region when a fix never arrives', async () => {
    getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

    const pending = getCurrentLocation();
    await vi.advanceTimersByTimeAsync(30_000);
    const location = await pending;

    expect(location.source).toBe('default');
    expect(location.lat).toBeTruthy();
  });

  it('still uses a fix that arrives before the deadline', async () => {
    getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 59.94, longitude: 30.31 } });

    const location = await getCurrentLocation();

    expect(location.source).toBe('gps');
    expect(location.lat).toBeCloseTo(59.94);
  });
});
