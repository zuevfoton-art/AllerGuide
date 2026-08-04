import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: vi.fn((key: string) => settings.get(key) ?? null),
  setSetting: vi.fn((key: string, value: string) => settings.set(key, value)),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/src/services/api-client', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.test'),
  apiRequest: vi.fn(),
}));

vi.mock('@/src/constants/features', () => ({
  GOOGLE_POLLEN_HEATMAP_ENABLED: false,
  MAP_POLLEN_GOOGLE_PRIMARY: false,
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
  vi.resetModules();
});

describe('pollen-map-service', () => {
  it('returns current Open-Meteo readings for the three target taxa', async () => {
    vi.doMock('@/src/constants/features', () => ({
      GOOGLE_POLLEN_HEATMAP_ENABLED: false,
      MAP_POLLEN_GOOGLE_PRIMARY: false,
    }));

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
    expect(snapshot.forecastDays.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.upiByTaxon.birch_pollen?.index).toBeGreaterThan(0);
    expect(snapshot.plants.birch_pollen?.crossReactionLabels.length).toBeGreaterThan(0);
    expect(snapshot.readings[0]).toMatchObject({
      taxonId: 'birch_pollen',
      value: 20,
      profileRelevant: true,
    });
    expect(snapshot.nearbyLocations).toHaveLength(8);
    expect(snapshot.yandexPollenUrl).toContain('/moscow/allergies');
  });

  it('uses Google forecast as primary and OM nearby as secondary', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      // Primary forecast must not hit Open-Meteo AQ center URL without multi-lat nearby.
      if (String(url).includes('air-quality-api.open-meteo.com') && String(url).includes(',')) {
        return {
          ok: true,
          json: async () =>
            Array.from({ length: 8 }, () => ({
              current: {
                birch_pollen: 2,
                grass_pollen: 1,
                ragweed_pollen: 1,
                alder_pollen: 1,
                mugwort_pollen: 1,
                olive_pollen: 1,
              },
            })),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.doMock('@/src/constants/features', () => ({
      GOOGLE_POLLEN_HEATMAP_ENABLED: true,
      MAP_POLLEN_GOOGLE_PRIMARY: true,
    }));

    const { apiRequest } = await import('@/src/services/api-client');
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      data: {
        forecast: {
          days: [
            {
              date: '2026-08-04',
              typeIndexes: {
                TREE: { index: 3, source: 'google' },
                GRASS: { index: 2, source: 'google' },
                WEED: { index: 1, source: 'google' },
              },
              plantIndexes: {
                birch_pollen: { index: 4, source: 'google', category: 'High' },
              },
              plants: {},
            },
            {
              date: '2026-08-05',
              typeIndexes: {
                TREE: { index: 2, source: 'google' },
              },
              plantIndexes: {},
              plants: {},
            },
          ],
          plants: {},
        },
      },
    } as never);

    const { fetchPollenMapSnapshot } = await import('./pollen-map-service');
    const snapshot = await fetchPollenMapSnapshot(location, '["birch-pollen"]');

    expect(snapshot.source).toBe('google');
    expect(snapshot.readings.find((item) => item.taxonId === 'birch_pollen')).toMatchObject({
      value: 4,
      level: 'high',
      profileRelevant: true,
    });
    expect(snapshot.forecastDays.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.upiByTaxon.birch_pollen?.source).toBe('google');
    expect(snapshot.nearbyLocations).toHaveLength(8);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('uses the location cache after a network failure', async () => {
    vi.doMock('@/src/constants/features', () => ({
      GOOGLE_POLLEN_HEATMAP_ENABLED: false,
      MAP_POLLEN_GOOGLE_PRIMARY: false,
    }));

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
    vi.doMock('@/src/constants/features', () => ({
      GOOGLE_POLLEN_HEATMAP_ENABLED: false,
      MAP_POLLEN_GOOGLE_PRIMARY: false,
    }));

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
      forecastDays: [],
    });
  });
});
