import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: vi.fn((key: string) => settings.get(key) ?? null),
  setSetting: vi.fn((key: string, value: string) => settings.set(key, value)),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

const location = {
  lat: 55.75,
  lon: 37.62,
  label: 'Москва',
  regionId: 'moscow',
  source: 'gps' as const,
};

beforeEach(() => {
  settings.clear();
  vi.restoreAllMocks();
});

describe('pollen-map-service', () => {
  it('returns current Open-Meteo readings for the three target taxa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('%2C') || url.match(/latitude=[^&]*,/)) {
          return {
            ok: true,
            json: async () =>
              Array.from({ length: 8 }, (_, index) => ({
                current: {
                  birch_pollen: index,
                  grass_pollen: index + 1,
                  ragweed_pollen: index + 2,
                  alder_pollen: index,
                  mugwort_pollen: index,
                  olive_pollen: index,
                },
              })),
          };
        }
        return {
          ok: true,
          json: async () => ({
            current: { time: '2026-07-28T10:00' },
            hourly: {
              time: ['2026-07-28T09:00', '2026-07-28T10:00'],
              birch_pollen: [1, 20],
              grass_pollen: [1, 6],
              ragweed_pollen: [1, 31],
            },
          }),
        };
      }),
    );

    const { fetchPollenMapSnapshot } = await import('./pollen-map-service');
    const snapshot = await fetchPollenMapSnapshot(location, '["birch-pollen"]');

    expect(snapshot.source).toBe('open-meteo');
    expect(snapshot.readings).toHaveLength(3);
    expect(snapshot.readings[0]).toMatchObject({
      taxonId: 'birch_pollen',
      value: 20,
      profileRelevant: true,
    });
    expect(snapshot.nearbyLocations).toHaveLength(8);
    expect(snapshot.yandexPollenUrl).toContain('/moscow/allergies');
  });

  it('uses the location cache after a network failure', async () => {
    const successfulFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        current: { time: '2026-07-28T10:00' },
        hourly: {
          time: ['2026-07-28T10:00'],
          birch_pollen: [20],
          grass_pollen: [6],
          ragweed_pollen: [31],
        },
      }),
    }));
    vi.stubGlobal('fetch', successfulFetch);

    const { fetchPollenMapSnapshot } = await import('./pollen-map-service');
    await fetchPollenMapSnapshot(location, '[]');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    const cached = await fetchPollenMapSnapshot(location, '["grass-pollen"]');

    expect(cached.source).toBe('cache');
    expect(cached.readings.find((reading) => reading.taxonId === 'grass_pollen'))
      .toMatchObject({ profileRelevant: true });
  });

  it('falls back to the regional calendar without live or cached data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    );

    const { fetchPollenMapSnapshot } = await import('./pollen-map-service');
    const snapshot = await fetchPollenMapSnapshot(location, '[]');

    expect(snapshot).toMatchObject({
      source: 'calendar',
      readings: [],
      nearbyLocations: [],
    });
  });
});
