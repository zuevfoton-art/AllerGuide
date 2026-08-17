import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { clearGoogleAirQualityCache } from '../services/google-air-quality';

const ORIGINAL_ENV = { ...process.env };

describe('air quality routes', () => {
  beforeEach(() => {
    process.env.AIR_QUALITY_ENABLED = 'true';
    process.env.GOOGLE_AIR_QUALITY_API_KEY = 'air test key';
    process.env.RATE_LIMIT_DISABLED = 'true';
    clearGoogleAirQualityCache();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
    clearGoogleAirQualityCache();
  });

  it('is disabled when the server flag is off', async () => {
    process.env.AIR_QUALITY_ENABLED = 'false';
    const app = await createApp();

    const response = await request(app).get('/api/air-quality/current?lat=55.75&lon=37.62');

    expect(response.status).toBe(503);
  });

  it('does not use the Pollen-only key as an Air Quality credential', async () => {
    delete process.env.GOOGLE_AIR_QUALITY_API_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    process.env.GOOGLE_POLLEN_API_KEY = 'pollen-only-key';
    const app = await createApp();

    const response = await request(app).get('/api/air-quality/current?lat=55.75&lon=37.62');

    expect(response.status).toBe(503);
  });

  it('requires valid coordinates', async () => {
    const app = await createApp();
    const response = await request(app).get('/api/air-quality/current?lat=999&lon=37.62');
    expect(response.status).toBe(400);
  });

  it('proxies currentConditions into a normalized snapshot', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          dateTime: '2026-08-14T09:00:00Z',
          regionCode: 'ru',
          indexes: [
            {
              code: 'uaqi',
              displayName: 'Universal AQI',
              aqi: 74,
              category: 'Good air quality',
              dominantPollutant: 'pm25',
            },
          ],
          pollutants: [
            {
              code: 'pm25',
              displayName: 'PM2.5',
              concentration: { value: 11.4, units: 'MICROGRAMS_PER_CUBIC_METER' },
            },
          ],
          healthRecommendations: {
            generalPopulation: 'Можно проводить время на улице.',
            lungDiseasePopulation: 'Сократите время на улице.',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp();

    const response = await request(app).get(
      '/api/air-quality/current?lat=55.75&lon=37.62&lang=ru',
    );

    expect(response.status).toBe(200);
    expect(response.body.airQuality).toMatchObject({
      regionCode: 'ru',
      universal: { code: 'uaqi', aqi: 74, dominantPollutant: 'pm25' },
      healthRecommendations: {
        general: 'Можно проводить время на улице.',
        sensitive: 'Сократите время на улице.',
      },
    });
    expect(response.body.airQuality.pollutants[0]).toMatchObject({
      code: 'pm25',
      value: 11.4,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('airquality.googleapis.com/v1/currentConditions:lookup');
    expect(url).toContain('key=air%20test%20key');
    const body = JSON.parse(String(init.body)) as {
      universalAqi: boolean;
      languageCode: string;
      extraComputations: string[];
    };
    expect(body.universalAqi).toBe(true);
    expect(body.languageCode).toBe('ru');
    expect(body.extraComputations).toContain('HEALTH_RECOMMENDATIONS');
  });

  it('caches current conditions per rounded coordinates', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ indexes: [{ code: 'uaqi', aqi: 60 }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp();

    await request(app).get('/api/air-quality/current?lat=55.751&lon=37.621');
    await request(app).get('/api/air-quality/current?lat=55.752&lon=37.622');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown heatmap types and proxies PNG tiles', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const fetchMock = vi.fn(async () =>
      new Response(png, { status: 200, headers: { 'Content-Type': 'image/png' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp();

    const invalid = await request(app).get('/api/air-quality/heatmap/BAD_TYPE/2/1/1');
    expect(invalid.status).toBe(400);

    const tile = await request(app).get(
      '/api/air-quality/heatmap/UAQI_INDIGO_PERSIAN/2/1/1',
    );
    expect(tile.status).toBe(200);
    expect(tile.headers['content-type']).toContain('image/png');
    const tileUrl = (fetchMock.mock.calls as unknown as [string, RequestInit][])[0]?.[0];
    expect(String(tileUrl)).toContain('/mapTypes/UAQI_INDIGO_PERSIAN/heatmapTiles/2/1/1');
  });
});
