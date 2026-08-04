import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerMapsRoutes } from './maps';

describe('maps routes', () => {
  beforeEach(() => {
    process.env.YANDEX_MAPS_INTERACTIVE_ENABLED = 'true';
    process.env.YANDEX_MAPS_JS_API_KEY = 'test-yandex-key';
  });

  it('serves interactive HTML embed', async () => {
    const app = express();
    registerMapsRoutes(app);

    const res = await request(app).get(
      '/api/maps/yandex-interactive?lat=55.75&lon=37.62&zoom=11&markers=%5B%7B%22id%22%3A%22a%22%2C%22latitude%22%3A55.76%2C%22longitude%22%3A37.63%2C%22title%22%3A%22A%22%7D%5D',
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('api-maps.yandex.ru/2.1/');
    expect(res.text).toContain('test-yandex-key');
    expect(res.text).toContain('55.75');
  });

  it('reports status', async () => {
    const app = express();
    registerMapsRoutes(app);
    const res = await request(app).get('/api/maps/yandex-status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, interactive: true });
  });
});
