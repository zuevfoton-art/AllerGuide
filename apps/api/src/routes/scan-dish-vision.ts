import type { Express, Request, Response } from 'express';
import { parseDishVisionResponse } from '@allerguide/ai';
import { resolveScanIdentity } from '../lib/scan-identity';
import {
  consumeScanBudget,
  recordBudgetRejection,
} from '../lib/scan-cache';
import {
  dishVisionCacheKey,
  getCachedDishVision,
  setCachedDishVision,
} from '../lib/dish-vision-cache';
import { logCaughtError } from '../lib/log-caught-error';
import {
  callDishVisionLlm,
  dishVisionConfigured,
  DishVisionProviderError,
} from '../services/llm-dish-vision-provider';

interface DishVisionRequestBody {
  imageBase64?: string;
  mimeType?: string;
}

/** Option D: multimodal dish photo → name + likely ingredients (no OCR text required). */
export function registerScanDishVisionRoutes(app: Express) {
  app.post('/api/scan/dish-vision', async (req: Request, res: Response) => {
    if (!dishVisionConfigured()) {
      res.status(503).json({ ok: false, error: 'Dish vision is disabled on this server' });
      return;
    }

    const identity = await resolveScanIdentity(req);
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body as DishVisionRequestBody;
    const imageBase64 = body.imageBase64?.trim();
    if (!imageBase64) {
      res.status(400).json({ ok: false, error: 'Missing imageBase64' });
      return;
    }

    const maxChars = Number(process.env.OCR_MAX_BASE64_CHARS || 6_000_000);
    if (imageBase64.length > maxChars) {
      res.status(413).json({ ok: false, error: 'Image too large' });
      return;
    }

    const cacheKey = dishVisionCacheKey(imageBase64, body.mimeType);
    const cached = getCachedDishVision(cacheKey);
    if (cached) {
      res.json({ ok: true, result: cached, cached: true });
      return;
    }

    if (!(await consumeScanBudget(identity))) {
      recordBudgetRejection();
      res.status(429).json({ ok: false, error: 'Daily scan budget exceeded' });
      return;
    }

    try {
      const content = await callDishVisionLlm({
        imageBase64,
        mimeType: body.mimeType,
      });

      const result = parseDishVisionResponse(content);
      if (!result) {
        res.status(502).json({ ok: false, error: 'Invalid dish vision response' });
        return;
      }

      setCachedDishVision(cacheKey, result);
      res.json({ ok: true, result, cached: false });
    } catch (error) {
      if (error instanceof DishVisionProviderError) {
        logCaughtError('scan.dishVision.provider', error);
        res.status(502).json({
          ok: false,
          error: error.providerError || 'Dish vision provider unavailable',
          providerStatus: error.status,
        });
        return;
      }
      logCaughtError('scan.dishVision', error);
      res.status(500).json({ ok: false, error: 'Dish vision failed' });
    }
  });
}
