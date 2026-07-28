import type { Express, Request, Response } from 'express';
import {
  isYandexCuratorSearchEnabled,
  isYandexMarketConfigured,
  listCuratedMarketProducts,
  resolveYandexOffer,
  searchYandexCuratorDrafts,
} from '../services/yandex-market-affiliate';
import { logCaughtError } from '../lib/log-caught-error';

export function registerMarketRoutes(app: Express) {
  app.get('/api/market/catalog', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      source: 'seed',
      products: listCuratedMarketProducts(),
      yandexConfigured: isYandexMarketConfigured(),
    });
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
   * YM-D: curator-only draft search. Never expose raw Market hits as allergy-safe catalog.
   * Gated by YANDEX_MARKET_CURATOR_SEARCH=true + partner credentials.
   */
  app.get('/api/market/offers/yandex/draft-search', async (req: Request, res: Response) => {
    if (!isYandexCuratorSearchEnabled()) {
      res.status(503).json({
        ok: false,
        error: 'Curator draft search is disabled',
        hint: 'Set YANDEX_MARKET_CURATOR_SEARCH=true after Distribution approval',
      });
      return;
    }

    const query = String(req.query.q ?? '').trim();
    if (query.length < 2) {
      res.status(400).json({ ok: false, error: 'Query too short' });
      return;
    }

    try {
      const drafts = await searchYandexCuratorDrafts(query);
      res.json({
        ok: true,
        drafts,
        warning:
          'Drafts are not allergy-safe. Curate containsAllergens before publishing to users.',
      });
    } catch (error) {
      logCaughtError('market.yandex.draftSearch', error);
      res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  });
}
