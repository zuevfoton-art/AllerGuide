import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/constants/features', () => ({
  AIR_QUALITY_GOOGLE_ENABLED: true,
}));

vi.mock('@/src/services/api-client', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.test'),
  apiRequest: vi.fn(),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
});

describe('air-quality-service', () => {
  it('fetches the current snapshot with the requested language', async () => {
    const { apiRequest } = await import('@/src/services/api-client');
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      data: {
        airQuality: {
          dateTime: '2026-08-14T09:00:00Z',
          regionCode: 'ru',
          universal: { code: 'uaqi', aqi: 74 },
          local: null,
          pollutants: [],
          healthRecommendations: null,
        },
      },
    } as never);

    const { fetchAirQualitySnapshot } = await import('./air-quality-service');
    const snapshot = await fetchAirQualitySnapshot(55.75, 37.62, 'de');
    expect(snapshot?.universal?.aqi).toBe(74);
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/air-quality/current?lat=55.75&lon=37.62&lang=de',
    );
  });

  it('returns null on network failure without throwing', async () => {
    const { apiRequest } = await import('@/src/services/api-client');
    vi.mocked(apiRequest).mockRejectedValue(new Error('offline'));

    const { fetchAirQualitySnapshot } = await import('./air-quality-service');
    await expect(fetchAirQualitySnapshot(55.75, 37.62)).resolves.toBeNull();
  });

  it('builds the UAQI heatmap tile URL', async () => {
    const { buildAirQualityHeatmapTileUrlTemplate } = await import('./air-quality-service');
    expect(buildAirQualityHeatmapTileUrlTemplate()).toBe(
      'https://api.test/api/air-quality/heatmap/UAQI_INDIGO_PERSIAN/{z}/{x}/{y}',
    );
  });
});
