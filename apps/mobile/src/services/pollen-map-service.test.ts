import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: vi.fn((key: string) => settings.get(key) ?? null),
  setSetting: vi.fn((key: string, value: string) => settings.set(key, value)),
  getLocale: vi.fn(() => 'ru'),
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
      const href = String(url);
      // Nearby uses multi-lat query (`latitude=a,b,c`); taxa commas alone must not match.
      if (
        href.includes('air-quality-api.open-meteo.com') &&
        /latitude=[^&]*,/.test(href)
      ) {
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
      // Center OM fills alder/olive when Google plantInfo has no index.
      if (href.includes('air-quality-api.open-meteo.com')) {
        return {
          ok: true,
          json: async () => ({
            current: { time: '2026-08-04T10:00' },
            hourly: {
              time: ['2026-08-04T10:00'],
              birch_pollen: [10],
              alder_pollen: [40],
              olive_pollen: [5],
              grass_pollen: [6],
              ragweed_pollen: [1],
              mugwort_pollen: [1],
            },
          }),
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
    expect(snapshot.typeIndexes.TREE?.index).toBe(3);
    expect(snapshot.typeIndexes.GRASS?.index).toBe(2);
    expect(snapshot.upiByTaxon.birch_pollen?.source).toBe('google');
    expect(snapshot.upiByTaxon.alder_pollen?.source).toBe('open-meteo');
    expect(snapshot.upiByTaxon.olive_pollen?.source).toBe('open-meteo');
    expect(snapshot.readings.find((item) => item.taxonId === 'alder_pollen')?.value).toBe(40);
    expect(snapshot.forecastDays.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.nearbyLocations).toHaveLength(8);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('synthesizes birch/alder/olive chips from Google plant UPI when Open-Meteo is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const href = String(url);
        if (href.includes('air-quality-api.open-meteo.com')) {
          return {
            ok: true,
            json: async () => ({
              current: { time: '2026-04-15T10:00' },
              hourly: { time: ['2026-04-15T10:00'] },
            }),
          };
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

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
              date: '2026-04-15',
              typeIndexes: {
                TREE: { index: 5, source: 'google' },
              },
              plantIndexes: {
                birch_pollen: { index: 4, source: 'google', category: 'High' },
                alder_pollen: { index: 2, source: 'google', category: 'Low' },
                olive_pollen: { index: 1, source: 'google', category: 'Very Low' },
              },
              plants: {},
            },
          ],
          plants: {},
        },
      },
    } as never);

    const { fetchPollenMapSnapshot } = await import('./pollen-map-service');
    const snapshot = await fetchPollenMapSnapshot(location, '["olive-pollen"]');

    expect(snapshot.source).toBe('google');
    expect(snapshot.upiByTaxon.birch_pollen).toMatchObject({ index: 4, source: 'google' });
    expect(snapshot.upiByTaxon.alder_pollen).toMatchObject({ index: 2, source: 'google' });
    expect(snapshot.upiByTaxon.olive_pollen).toMatchObject({ index: 1, source: 'google' });
    expect(snapshot.readings.find((item) => item.taxonId === 'olive_pollen')).toMatchObject({
      value: 1,
      profileRelevant: true,
    });
    expect(snapshot.readings.find((item) => item.taxonId === 'birch_pollen')?.value).not.toBe(5);
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
