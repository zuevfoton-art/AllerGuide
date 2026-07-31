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

  it('rejects invalid type', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).get(
      '/api/places/nearby?lat=55.75&lon=37.62&type=airport',
    );
    expect(response.status).toBe(400);
  });

  it('proxies Google Places Nearby into MapPoi DTOs', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'OK',
          results: [
            {
              place_id: 'p1',
              name: 'Safe Bowl',
              vicinity: 'Moscow',
              rating: 4.6,
              types: ['restaurant', 'food'],
              geometry: { location: { lat: 55.75, lng: 37.62 } },
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
      category: 'restaurant',
      source: 'google-places',
    });
  });
});
