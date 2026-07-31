import type { Express, Request, Response } from 'express';
import { verifyAuthToken } from '../lib/jwt';
import { logCaughtError } from '../lib/log-caught-error';
import {
  consumeSearchBudget,
  getCachedIngredients,
  recordSearchBudgetRejection,
  recordSearchCacheHit,
  recordSearchCacheMiss,
  searchIngredientsCacheKey,
  setCachedIngredients,
} from '../lib/search-ingredients-cache';
import {
  searchIngredientsWithYandex,
  yandexSearchConfigured,
} from '../services/yandex-search-ingredients';

interface SearchRequestBody {
  query?: string;
}

async function resolveIdentity(req: Request): Promise<string | null> {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const payload = await verifyAuthToken(header.slice('Bearer '.length).trim());
    if (payload) return `user:${payload.sub}`;
  }
  if (process.env.SCAN_REQUIRE_AUTH === 'true') return null;
  return `ip:${req.ip ?? 'unknown'}`;
}

/** Option C: Yandex Search API ingredients lookup when OFF/catalog miss. */
export function registerSearchIngredientsRoutes(app: Express) {
  app.post('/api/search/ingredients', async (req: Request, res: Response) => {
    if (!yandexSearchConfigured()) {
      res.status(503).json({ ok: false, error: 'Yandex Search is disabled on this server' });
      return;
    }

    const identity = await resolveIdentity(req);
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body as SearchRequestBody;
    const query = body.query?.trim() ?? '';
    if (query.length < 2) {
      res.status(400).json({ ok: false, error: 'Missing query' });
      return;
    }

    const cacheKey = searchIngredientsCacheKey(query);
    const cached = await getCachedIngredients(cacheKey);
    if (cached) {
      recordSearchCacheHit();
      res.json({ ok: true, ...cached, cached: true });
      return;
    }

    recordSearchCacheMiss();
    if (!consumeSearchBudget(identity)) {
      recordSearchBudgetRejection();
      res.status(429).json({ ok: false, error: 'Daily search budget exceeded' });
      return;
    }

    try {
      const result = await searchIngredientsWithYandex(query);
      if (!result) {
        res.status(404).json({ ok: false, error: 'Ingredients not found' });
        return;
      }
      await setCachedIngredients(cacheKey, result);
      res.json({ ok: true, ...result, cached: false });
    } catch (error) {
      logCaughtError('search.ingredients', error);
      res.status(500).json({ ok: false, error: 'Search failed' });
    }
  });
}
