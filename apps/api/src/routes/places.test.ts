import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { clearGooglePlacesNearbyCache } from '../services/google-places-nearby';

const ORIGINAL_ENV = { ...process.env };

describe('places nearby routes', () => {
  beforeEach(() => {
    process.env.MAP_PLACES_ENABLED = 'true';
    process.env.GOOGLE_PLACES_API_KEY = 'places test key';
    process.env.RATE_LIMIT_DISABLED = 'true';
    clearGooglePlacesNearbyCache();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
    clearGooglePlacesNearbyCache();
  });

  it('is disabled when the server flag is off', async () => {
    process.env.MAP_PLACES_ENABLED = 'false';
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get('/api/places/nearby?lat=55.75&lon=37.62');

    expect(response.status).toBe(503);
  });

  it('does not use the Pollen-only key as a Places credential', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    process.env.GOOGLE_POLLEN_API_KEY = 'pollen-only-key';
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get('/api/places/nearby?lat=55.75&lon=37.62');

    expect(response.status).toBe(503);
  });

  it('rejects invalid type', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).get(
      '/api/places/nearby?lat=55.75&lon=37.62&type=airport',
    );
    expect(response.status).toBe(400);
  });

  it('proxies Places API (New) searchNearby into MapPoi DTOs', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          places: [
            {
              id: 'p1',
              displayName: { text: 'Safe Bowl', languageCode: 'ru' },
              formattedAddress: 'Москва, Тверская 1',
              rating: 4.6,
              types: ['restaurant', 'food'],
              location: { latitude: 55.75, longitude: 37.62 },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get(
      '/api/places/nearby?lat=55.75&lon=37.62&type=restaurant',
    );

    expect(response.status).toBe(200);
    expect(response.body.places).toHaveLength(1);
    expect(response.body.places[0]).toMatchObject({
      id: 'google:p1',
      title: 'Safe Bowl',
      note: 'Москва, Тверская 1',
      category: 'restaurant',
      source: 'google-places',
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchNearby');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Goog-Api-Key']).toBe('places test key');
    expect(headers['X-Goog-FieldMask']).toContain('places.displayName');
    const body = JSON.parse(String(init.body)) as {
      includedTypes: string[];
      locationRestriction: { circle: { center: { latitude: number } } };
    };
    expect(body.includedTypes).toEqual(['restaurant']);
    expect(body.locationRestriction.circle.center.latitude).toBe(55.75);
  });

  it('fetches cafes as a dedicated category', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          places: [
            {
              id: 'c1',
              displayName: { text: 'Coffee Lab' },
              formattedAddress: 'Москва, Арбат 10',
              rating: 4.8,
              types: ['cafe', 'coffee_shop'],
              location: { latitude: 55.75, longitude: 37.59 },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get(
      '/api/places/nearby?lat=55.75&lon=37.62&type=cafe',
    );

    expect(response.status).toBe(200);
    expect(response.body.places[0]).toMatchObject({
      id: 'google:c1',
      category: 'cafe',
      icon: 'cafe',
    });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    ) as { includedTypes: string[] };
    expect(body.includedTypes).toEqual(['cafe', 'coffee_shop', 'bakery']);
  });

  it('maps the legacy hospital type alias to medical', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ places: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get(
      '/api/places/nearby?lat=55.75&lon=37.62&type=hospital',
    );

    expect(response.status).toBe(200);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    ) as { includedTypes: string[] };
    expect(body.includedTypes).toEqual(['hospital', 'doctor']);
  });
});
