import type { Express, Request, Response } from 'express';
import { buildDishResolvePrompt, parseDishResolveLlm } from '@allerguide/ai';
import {
  DISH_COMPONENTS_BY_ID,
  allergenIdsToDishComponents,
  findDishRecipe,
  mergeDishComponents,
} from '@allerguide/core';
import { logCaughtError } from '../lib/log-caught-error';
import { bundledDishSuggestions, searchDishes } from '../services/dish-catalog-store';
import { callScanLlm } from '../services/llm-scan-provider';

function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function dishLlmEnabled(): boolean {
  return process.env.DISH_LLM_ENABLED === 'true' && process.env.AI_SCAN_ENABLED === 'true';
}

export function registerDishRoutes(app: Express) {
  app.get('/api/dishes/search', async (req: Request, res: Response) => {
    const query = String(req.query.q ?? '').trim();
    if (query.length < 2) {
      res.status(400).json({ ok: false, error: 'Query too short' });
      return;
    }

    try {
      const suggestions = databaseConfigured()
        ? await searchDishes(query)
        : bundledDishSuggestions(query);
      res.json({
        ok: true,
        source: databaseConfigured() ? 'catalog' : 'bundled',
        count: suggestions.length,
        dishes: suggestions,
      });
    } catch (error) {
      logCaughtError('dishes.search', error, { query });
      res.json({
        ok: true,
        source: 'bundled',
        count: bundledDishSuggestions(query).length,
        dishes: bundledDishSuggestions(query),
      });
    }
  });

  app.post('/api/dishes/resolve', async (req: Request, res: Response) => {
    if (!dishLlmEnabled()) {
      res.status(503).json({ ok: false, error: 'Dish LLM is disabled on this server' });
      return;
    }

    const query = String((req.body as { query?: string })?.query ?? '').trim();
    if (query.length < 2) {
      res.status(400).json({ ok: false, error: 'Query too short' });
      return;
    }

    const local = findDishRecipe(query);
    if (local) {
      res.json({
        ok: true,
        source: 'local',
        canonicalName: local.names[0],
        kind: 'dish',
        dishId: local.id,
        ingredients: local.components.map((item) => item.nameRu),
        components: local.components,
      });
      return;
    }

    try {
      const raw = await callScanLlm(buildDishResolvePrompt(query));
      const parsed = parseDishResolveLlm(raw);
      if (!parsed) {
        res.status(404).json({ ok: false, error: 'Dish not resolved' });
        return;
      }

      const afterNormalize = findDishRecipe(parsed.canonicalName);
      const fromIds = parsed.ingredients
        .map((id) => DISH_COMPONENTS_BY_ID[id])
        .filter(Boolean);
      const fromHints = allergenIdsToDishComponents(parsed.allergenHints);
      const components = afterNormalize
        ? mergeDishComponents(afterNormalize.components, fromIds, fromHints)
        : mergeDishComponents(fromIds, fromHints);

      res.json({
        ok: true,
        source: 'llm',
        canonicalName: afterNormalize?.names[0] ?? parsed.canonicalName,
        kind: parsed.kind,
        dishId: afterNormalize?.id ?? `llm:${parsed.canonicalName}`,
        ingredients: components.map((item) => item.nameRu),
        components,
      });
    } catch (error) {
      logCaughtError('dishes.resolve', error, { query });
      res.status(500).json({ ok: false, error: 'Resolve failed' });
    }
  });
}
