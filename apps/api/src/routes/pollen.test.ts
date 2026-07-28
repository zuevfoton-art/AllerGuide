import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const ORIGINAL_ENV = { ...process.env };
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe('pollen heatmap routes', () => {
  beforeEach(() => {
    process.env.POLLEN_HEATMAP_ENABLED = 'true';
    process.env.GOOGLE_POLLEN_API_KEY = 'stage test key';
    process.env.RATE_LIMIT_DISABLED = 'true';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('is disabled by default when the server flag is off', async () => {
    process.env.POLLEN_HEATMAP_ENABLED = 'false';
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get('/api/pollen/heatmap/TREE_UPI/6/38/20');

    expect(response.status).toBe(503);
  });

  it('rejects unknown UPI groups and invalid tile coordinates', async () => {
    const app = await createApp({ withReplitAuth: false });

    const mapTypeResponse = await request(app).get(
      '/api/pollen/heatmap/BIRCH_UPI/6/38/20',
    );
    const coordinatesResponse = await request(app).get(
      '/api/pollen/heatmap/TREE_UPI/6/64/20',
    );

    expect(mapTypeResponse.status).toBe(400);
    expect(coordinatesResponse.status).toBe(400);
  });

  it('proxies a PNG tile without allowing persistent caching', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(PNG_SIGNATURE, {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get('/api/pollen/heatmap/TREE_UPI/6/38/20');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toEqual(Buffer.from(PNG_SIGNATURE));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pollen.googleapis.com/v1/mapTypes/TREE_UPI/heatmapTiles/6/38/20?key=stage%20test%20key',
      { headers: { Accept: 'image/png' } },
    );
  });

  it('does not proxy an unexpected upstream content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'quota' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const app = await createApp({ withReplitAuth: false });

    const response = await request(app).get('/api/pollen/heatmap/GRASS_UPI/6/38/20');

    expect(response.status).toBe(502);
  });
});
