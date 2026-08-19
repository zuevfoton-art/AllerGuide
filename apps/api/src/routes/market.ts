import type { Express, Request, Response } from 'express';
import {
  isMarketplaceCategory,
  isMarketplaceProductKind,
  type MarketplaceCategory,
  type MarketplaceProductKind,
} from '@allerguide/core';
import { logCaughtError } from '../lib/log-caught-error';
import {
  isYandexCuratorSearchEnabled,
  isYandexMarketConfigured,
  resolveYandexOffer,
} from '../services/yandex-market-affiliate';
import {
  isPharmacyFeedConfigured,
  isYandexFeedConfigured,
} from '../services/marketplace/import-market-feeds';
import { listPublishedMarketplaceProducts } from '../services/marketplace/market-catalog-store';

const DEFAULT_CATALOG_LIMIT = 40;
const MAX_CATALOG_LIMIT = 80;

export function registerMarketRoutes(app: Express) {
  app.get('/api/market/health', async (_req: Request, res: Response) => {
    try {
      const { products, source } = await listPublishedMarketplaceProducts();
      res.json({
        ok: true,
        catalog: {
          source,
          liveCatalog: source === 'db',
          productCount: products.length,
          freshness: freshnessFromProducts(products),
        },
        yandexConfigured: isYandexMarketConfigured(),
        yandexFeedConfigured: isYandexFeedConfigured(),
        pharmacyFeedConfigured: isPharmacyFeedConfigured(),
        curatorSearchAvailable: isYandexCuratorSearchEnabled(),
      });
    } catch (error) {
      logCaughtError('market.health', error);
      res.status(500).json({ ok: false, error: 'Market health unavailable' });
    }
  });

  app.get('/api/market/catalog', async (req: Request, res: Response) => {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const kind = typeof req.query.kind === 'string' ? req.query.kind.trim() : '';
    const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
    const limit = clampLimit(req.query.limit);

    try {
      const { products, source } = await listPublishedMarketplaceProducts();
      const filtered = products.filter((product) => {
        if (category && isMarketplaceCategory(category) && product.category !== category) {
          return false;
        }
        if (kind && isMarketplaceProductKind(kind) && product.kind !== kind) {
          return false;
        }
        return true;
      });

      res.json({
        ok: true,
        source,
        products: filtered.slice(offset, offset + limit),
        total: filtered.length,
        offset,
        limit,
        yandexConfigured: isYandexMarketConfigured(),
        yandexFeedConfigured: isYandexFeedConfigured(),
        pharmacyFeedConfigured: isPharmacyFeedConfigured(),
        freshness: freshnessFromProducts(filtered),
      });
    } catch (error) {
      logCaughtError('market.catalog', error);
      res.status(500).json({ ok: false, error: 'Catalog unavailable' });
    }
  });

  /**
   * Resolve a curated Market URL/article into an affiliate deep-link.
   * Secrets stay on the API; mobile only receives the final URL + optional enrichments.
   */
  app.post('/api/market/offers/yandex/resolve', async (req: Request, res: Response) => {
    const marketUrl =
      typeof req.body?.marketUrl === 'string' ? req.body.marketUrl.trim() : undefined;
    const marketArticle =
      typeof req.body?.marketArticle === 'string' ? req.body.marketArticle.trim() : undefined;
    const productId =
      typeof req.body?.productId === 'string' ? req.body.productId.trim() : undefined;

    if (!marketUrl && !marketArticle && !productId) {
      res.status(400).json({
        ok: false,
        error: 'Provide marketUrl, marketArticle, or productId',
      });
      return;
    }

    try {
      const resolved = await resolveYandexOffer({ marketUrl, marketArticle, productId });
      res.json({ ok: true, ...resolved });
    } catch (error) {
      logCaughtError('market.yandex.resolve', error);
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Resolve failed',
      });
    }
  });

  /**
   * YM-D: curator-only draft search. Affiliate GET /search was retired 2026-06-22.
   * Keep the route gated so clients receive a stable 503 unless explicitly enabled.
   */
  app.get('/api/market/offers/yandex/draft-search', async (req: Request, res: Response) => {
    if (!isYandexCuratorSearchEnabled()) {
      res.status(503).json({
        ok: false,
        error: 'Curator draft search is disabled',
        hint: 'Use YANDEX_MARKET_FEED_URL import instead of live search',
      });
      return;
    }

    const query = String(req.query.q ?? '').trim();
    if (query.length < 2) {
      res.status(400).json({ ok: false, error: 'Query too short' });
      return;
    }

    res.status(410).json({
      ok: false,
      error: 'Yandex Affiliate GET /search is no longer supported',
      hint: 'Import the official product feed and curate drafts in catalog.market_products',
    });
  });
}

function clampLimit(raw: unknown): number {
  const parsed = Number(raw ?? DEFAULT_CATALOG_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_CATALOG_LIMIT;
  return Math.min(MAX_CATALOG_LIMIT, Math.max(1, Math.floor(parsed)));
}

function freshnessFromProducts(
  products: Array<{ refreshedAt?: string }>,
): { refreshedAt?: string; stale: boolean } {
  const timestamps = products
    .map((product) => Date.parse(product.refreshedAt ?? ''))
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return { stale: false };
  const newest = Math.max(...timestamps);
  const stale = Date.now() - newest > 12 * 60 * 60 * 1000;
  return { refreshedAt: new Date(newest).toISOString(), stale };
}

export type MarketCatalogFilter = {
  category?: MarketplaceCategory;
  kind?: MarketplaceProductKind;
};
