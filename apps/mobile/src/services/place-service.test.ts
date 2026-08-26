import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/services/settings-service', () => ({
  getLocale: vi.fn(() => 'ru'),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

vi.mock('@/src/services/api-client', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/src/constants/features', () => ({
  MAP_PLACES_ENABLED: true,
}));

const moscow = { latitude: 55.75, longitude: 37.62 };
const london = { latitude: 51.5, longitude: -0.12 };

beforeEach(async () => {
  vi.resetModules();
  const { apiRequest } = await import('@/src/services/api-client');
  vi.mocked(apiRequest).mockReset();
});

describe('place-service', () => {
  it('merges live nearby results with the ADAIR overlay', async () => {
    const { apiRequest } = await import('@/src/services/api-client');
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      data: {
        places: [
          {
            id: 'google:p1',
            title: 'Аптека',
            note: 'Москва',
            category: 'pharmacy',
            lat: 55.75,
            lng: 37.62,
            level: 'medium',
            icon: 'medkit',
            tags: ['pharmacy'],
            source: 'google-places',
            allergySafety: 'unknown',
          },
        ],
      },
    } as never);

    const { searchMapPlaces } = await import('./place-service');
    const result = await searchMapPlaces(null, moscow, ['adair', 'pharmacy']);
    expect(result.source).toBe('google-places');
    expect(result.pois.some((poi) => poi.id === 'google:p1')).toBe(true);
    expect(result.pois.some((poi) => poi.source === 'adair')).toBe(true);
    expect(result.pois.find((poi) => poi.id === 'google:p1')?.allergySafety).toBe('unknown');
  });

  it('keeps an empty live result empty when ADAIR is off', async () => {
    const { apiRequest } = await import('@/src/services/api-client');
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      data: { places: [] },
    } as never);

    const { searchMapPlaces } = await import('./place-service');
    const result = await searchMapPlaces(null, moscow, ['restaurant']);
    expect(result.liveEmpty).toBe(true);
    expect(result.pois).toEqual([]);
  });

  it('still shows ADAIR pins when live nearby is empty', async () => {
    const { apiRequest } = await import('@/src/services/api-client');
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      data: { places: [] },
    } as never);

    const { searchMapPlaces } = await import('./place-service');
    const result = await searchMapPlaces(null, moscow, ['adair', 'medical']);
    expect(result.liveEmpty).toBe(false);
    expect(result.pois.some((poi) => poi.source === 'adair')).toBe(true);
    expect(result.source).toBe('adair');
  });

  it('does not call Places when only the ADAIR filter is on', async () => {
    const { apiRequest } = await import('@/src/services/api-client');
    const { searchMapPlaces } = await import('./place-service');
    const result = await searchMapPlaces(null, london, ['adair']);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(result.source).toBe('adair');
    expect(result.pois.every((poi) => poi.source === 'adair')).toBe(true);
    expect(result.pois.length).toBeGreaterThan(0);
  });

  it('does not show Moscow catalog pins when the origin is outside the region', async () => {
    vi.doMock('@/src/constants/features', () => ({
      MAP_PLACES_ENABLED: false,
    }));
    const { searchMapPlaces } = await import('./place-service');
    const result = await searchMapPlaces(null, london, ['restaurant', 'cafe']);
    expect(result.pois.every((poi) => poi.source !== 'catalog')).toBe(true);
  });

  it('passes locale and categories to text search', async () => {
    vi.doMock('@/src/constants/features', () => ({
      MAP_PLACES_ENABLED: true,
    }));
    const { apiRequest } = await import('@/src/services/api-client');
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      data: { places: [] },
    } as never);

    const { searchLiveMapPlaces } = await import('./place-service');
    await searchLiveMapPlaces(moscow, 'аптека', ['pharmacy']);
    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/api/places/search?q=%D0%B0%D0%BF%D1%82%D0%B5%D0%BA%D0%B0'),
    );
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('categories=pharmacy'));
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('lang=ru'));
  });
});
