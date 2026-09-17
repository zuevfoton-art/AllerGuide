import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })),
  );
});

describe('wellness-service GPS fallback', () => {
  it('uses default region label when location is omitted', async () => {
    const { fetchWellnessSnapshot } = await import('./wellness-service');

    const snapshot = await fetchWellnessSnapshot('[]', [], 'ru');

    expect(snapshot.regionId).toBeTruthy();
    expect(snapshot.locationLabel).toBeTruthy();
    expect(['good', 'moderate', 'attention', 'high-risk']).toContain(snapshot.level);
    expect(snapshot.envDataAvailable).toBe(false);
  });

  it('accepts explicit coordinates for region resolution', async () => {
    const { fetchWellnessSnapshot } = await import('./wellness-service');

    const snapshot = await fetchWellnessSnapshot('[]', [], 'ru', {
      lat: 55.75,
      lon: 37.62,
      label: 'Moscow',
    });

    expect(snapshot.regionId).toBe('moscow');
    expect(snapshot.locationLabel).toBe('Moscow');
  });

  it('exposes immune-balance rings and the selected day', async () => {
    const { fetchWellnessSnapshot } = await import('./wellness-service');
    const snapshot = await fetchWellnessSnapshot('[]', [], 'ru', undefined, {
      asOf: new Date(2026, 8, 10),
    });
    expect(snapshot.asOf).toBe('2026-09-10');
    expect(snapshot.rings.pollen).toBeGreaterThanOrEqual(0);
    expect(snapshot.rings.pollen).toBeLessThanOrEqual(100);
    expect(snapshot.rings.clinical).toBeNull();
  });
});
