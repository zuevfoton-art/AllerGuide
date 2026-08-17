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
    const app = await createApp();

    const response = await request(app).get('/api/places/nearby?lat=55.75&lon=37.62');

    expect(response.status).toBe(503);
  });

  it('does not use the Pollen-only key as a Places credential', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    process.env.GOOGLE_POLLEN_API_KEY = 'pollen-only-key';
    const app = await createApp();

    const response = await request(app).get('/api/places/nearby?lat=55.75&lon=37.62');

    expect(response.status).toBe(503);
  });

  it('stays enabled when the server flag is unset', async () => {
    delete process.env.MAP_PLACES_ENABLED;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ places: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get('/api/places/nearby?lat=55.75&lon=37.62');

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('rejects invalid type', async () => {
    const app = await createApp();
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
    const app = await createApp();

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
    const app = await createApp();

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
    const app = await createApp();

    const response = await request(app).get(
      '/api/places/nearby?lat=55.75&lon=37.62&type=hospital',
    );

    expect(response.status).toBe(200);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    ) as { includedTypes: string[] };
    expect(body.includedTypes).toEqual(['hospital', 'doctor']);
  });

  it('does not cache nearby results and keeps allergySafety unknown', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          places: [
            {
              id: 'p1',
              displayName: { text: 'Safe Bowl' },
              formattedAddress: 'Москва',
              rating: 4.9,
              types: ['restaurant'],
              location: { latitude: 55.75, longitude: 37.62 },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp();

    await request(app).get('/api/places/nearby?lat=55.75&lon=37.62&type=restaurant');
    const second = await request(app).get(
      '/api/places/nearby?lat=55.75&lon=37.62&categories=restaurant',
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second.headers['cache-control']).toBe('private, no-store');
    expect(second.body.places[0]).toMatchObject({
      allergySafety: 'unknown',
      rating: 4.9,
      level: 'medium',
    });
  });

  it('proxies Autocomplete (New) with a session token and field mask', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                placeId: 'ChIJabc',
                structuredFormat: {
                  mainText: { text: 'Аптека 36.6' },
                  secondaryText: { text: 'Тверская, Москва' },
                },
                distanceMeters: 120,
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp();

    const short = await request(app).get('/api/places/autocomplete?q=а&lat=55.75&lon=37.62');
    expect(short.status).toBe(400);

    const response = await request(app).get(
      '/api/places/autocomplete?q=аптека&lat=55.75&lon=37.62&sessionToken=ps-test-session-1&categories=pharmacy&lang=ru',
    );
    expect(response.status).toBe(200);
    expect(response.body.suggestions[0]).toMatchObject({
      placeId: 'ChIJabc',
      primaryText: 'Аптека 36.6',
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://places.googleapis.com/v1/places:autocomplete');
    expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).toContain(
      'suggestions.placePrediction.placeId',
    );
    const body = JSON.parse(String(init.body)) as {
      sessionToken?: string;
      input: string;
      includedPrimaryTypes?: string[];
    };
    expect(body.sessionToken).toBe('ps-test-session-1');
    expect(body.input).toBe('аптека');
    expect(body.includedPrimaryTypes).toEqual(['pharmacy', 'drugstore']);
  });

  it('omits Autocomplete includedPrimaryTypes when all map categories are selected', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp();

    const response = await request(app).get(
      '/api/places/autocomplete?q=аптека&lat=55.75&lon=37.62&sessionToken=ps-test-session-2&categories=restaurant,cafe,medical,pharmacy',
    );
    expect(response.status).toBe(200);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as {
      includedPrimaryTypes?: string[];
    };
    expect(body.includedPrimaryTypes).toBeUndefined();
  });

  it('proxies Text Search (New) and Place Details without photos', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('searchText')) {
        return new Response(
          JSON.stringify({
            places: [
              {
                id: 'ChIJpharm',
                displayName: { text: 'Аптека у метро' },
                formattedAddress: 'Москва',
                types: ['pharmacy'],
                location: { latitude: 55.75, longitude: 37.62 },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          id: 'ChIJpharm',
          displayName: { text: 'Аптека у метро' },
          formattedAddress: 'Москва, Тверская 1',
          types: ['pharmacy'],
          location: { latitude: 55.75, longitude: 37.62 },
          nationalPhoneNumber: '+7 495 000-00-00',
          websiteUri: 'https://example.com',
          googleMapsUri: 'https://maps.google.com/?cid=1',
          regularOpeningHours: { weekdayDescriptions: ['Mon: 09:00-21:00'] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp();

    const search = await request(app).get(
      '/api/places/search?q=аптека&lat=55.75&lon=37.62&categories=pharmacy',
    );
    expect(search.status).toBe(200);
    expect(search.body.places[0]).toMatchObject({
      id: 'google:ChIJpharm',
      allergySafety: 'unknown',
    });

    const details = await request(app).get(
      '/api/places/ChIJpharm?lang=ru&sessionToken=ps-test-session-1',
    );
    expect(details.status).toBe(200);
    expect(details.body.place).toMatchObject({
      phone: '+7 495 000-00-00',
      websiteUri: 'https://example.com',
      googleMapsUri: 'https://maps.google.com/?cid=1',
    });
    expect(JSON.stringify(details.body)).not.toContain('reviews');
    const detailsCall = (fetchMock.mock.calls as unknown as [string, RequestInit][]).find((call) =>
      String(call[0]).includes('/v1/places/ChIJpharm'),
    );
    expect(detailsCall).toBeTruthy();
    const detailsHeaders = detailsCall?.[1]?.headers as Record<string, string>;
    expect(detailsHeaders['X-Goog-FieldMask']).not.toContain('photos');
  });

  it('maps upstream 429 onto the Places routes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('quota', { status: 429 })),
    );
    const app = await createApp();
    const response = await request(app).get(
      '/api/places/search?q=аптека&lat=55.75&lon=37.62',
    );
    expect(response.status).toBe(429);
  });
});
