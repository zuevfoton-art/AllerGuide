import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { __clearYandexResolveCacheForTests } from '../services/yandex-market-affiliate';

const ORIGINAL_ENV = { ...process.env };

describe('market routes (Yandex affiliate)', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    delete process.env.DATABASE_URL;
    delete process.env.YANDEX_MARKET_CLID;
    delete process.env.YANDEX_MARKET_OAUTH_TOKEN;
    delete process.env.YANDEX_MARKET_ERID;
    delete process.env.YANDEX_MARKET_CURATOR_SEARCH;
    __clearYandexResolveCacheForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    __clearYandexResolveCacheForTests();
    vi.unstubAllGlobals();
  });

  it('serves curated seed catalog with yandex offers', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).get('/api/market/catalog');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.source).toBe('seed');
    expect(response.body.yandexConfigured).toBe(false);
    const withYandex = (response.body.products as Array<{ offers?: Array<{ merchant: string }> }>).filter(
      (product) => product.offers?.some((offer) => offer.merchant === 'yandex_market'),
    );
    expect(withYandex.length).toBeGreaterThanOrEqual(5);
  });

  it('resolves productId via static seed URL when partner API is not configured', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/market/offers/yandex/resolve')
      .send({ productId: 'air-purifier' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.merchant).toBe('yandex_market');
    expect(response.body.source).toBe('static');
    expect(response.body.affiliateUrl).toContain('market.yandex.ru');
  });

  it('rejects resolve without identifiers', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).post('/api/market/offers/yandex/resolve').send({});
    expect(response.status).toBe(400);
  });

  it('uses partner link/create when configured and caches the result', async () => {
    process.env.YANDEX_MARKET_CLID = '15085330';
    process.env.YANDEX_MARKET_OAUTH_TOKEN = 'test-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        link: {
          shortUrl: 'https://market.yandex.ru/cc/demo',
          title: 'HEPA demo',
        },
        price: 9990,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp({ withReplitAuth: false });
    const first = await request(app)
      .post('/api/market/offers/yandex/resolve')
      .send({ marketUrl: 'https://market.yandex.ru/search?text=hepa' });
    const second = await request(app)
      .post('/api/market/offers/yandex/resolve')
      .send({ marketUrl: 'https://market.yandex.ru/search?text=hepa' });

    expect(first.status).toBe(200);
    expect(first.body.source).toBe('api');
    expect(first.body.affiliateUrl).toBe('https://market.yandex.ru/cc/demo');
    expect(first.body.priceRub).toBe(9990);
    expect(second.body.source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps draft search disabled by default', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).get('/api/market/offers/yandex/draft-search?q=hepa');
    expect(response.status).toBe(503);
  });
});
