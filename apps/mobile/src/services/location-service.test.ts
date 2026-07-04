/* eslint-disable import/first -- vitest mocks must be registered before module import */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => store.get(key) ?? '',
  setSetting: (key: string, value: string) => {
    store.set(key, value);
  },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: vi.fn(),
  Accuracy: { Balanced: 3 },
}));

import {
  getCurrentLocation,
  getDefaultResolvedLocation,
  getManualPollenRegionId,
  setManualPollenRegionId,
} from './location-service';

describe('location-service', () => {
  beforeEach(() => {
    store.clear();
    setManualPollenRegionId(null);
  });

  it('returns default location on web', async () => {
    const location = await getCurrentLocation();
    expect(['default', 'manual']).toContain(location.source);
    expect(location.lat).toBeTruthy();
  });

  it('uses manual region override', () => {
    setManualPollenRegionId('saint-petersburg');
    expect(getManualPollenRegionId()).toBe('saint-petersburg');
  });

  it('default resolved location has label', () => {
    const loc = getDefaultResolvedLocation();
    expect(loc.label.length).toBeGreaterThan(0);
  });
});
