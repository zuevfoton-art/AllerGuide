import type { Express, Request, Response } from 'express';
import { buildScanPrompt, parseLlmScanResponse, type ScanMode } from '@allerguide/ai';
import { verifyAuthToken } from '../lib/jwt';
import {
  consumeScanBudget,
  getCachedScan,
  getScanMetrics,
  recordBudgetRejection,
  recordCacheHit,
  recordCacheMiss,
  scanCacheKey,
  setCachedScan,
} from '../lib/scan-cache';
import { logCaughtError } from '../lib/log-caught-error';
import { callScanLlm } from '../services/llm-scan-provider';

interface ScanRequestBody {
  mode?: ScanMode;
  text?: string;
  allergens?: string[];
  productName?: string;
  prompt?: string;
}

function isScanEnabled(): boolean {
  return process.env.AI_SCAN_ENABLED === 'true';
}

function requireScanAuth(): boolean {
  return process.env.SCAN_REQUIRE_AUTH === 'true';
}

/** Identify the caller for budgeting: prefer authenticated user, fall back to IP. */
async function resolveScanIdentity(req: Request): Promise<string | null> {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const payload = await verifyAuthToken(header.slice('Bearer '.length).trim());
    if (payload) return `user:${payload.sub}`;
  }
  if (requireScanAuth()) return null;
  return `ip:${req.ip ?? 'unknown'}`;
}

function logScanCacheEvent(hit: boolean): void {
  const metrics = getScanMetrics();
  console.info(
    `[scan] cache_${hit ? 'hit' : 'miss'} hits=${metrics.cacheHits} misses=${metrics.cacheMisses} hitRate=${metrics.hitRate ?? 'n/a'}`,
  );
}

export function registerScanRoutes(app: Express) {
  app.post('/api/scan', async (req: Request, res: Response) => {
    if (!isScanEnabled()) {
      res.status(503).json({ ok: false, error: 'AI scan is disabled on this server' });
      return;
    }

    const identity = await resolveScanIdentity(req);
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body as ScanRequestBody;
    const mode = body.mode ?? 'product';
    const text = body.text?.trim();
    const allergens = Array.isArray(body.allergens) ? body.allergens.map(String) : [];

    if (!text) {
      res.status(400).json({ ok: false, error: 'Missing text' });
      return;
    }

    const cacheKey = scanCacheKey({
      mode,
      text,
      allergens,
      productName: body.productName,
      prompt: body.prompt,
    });

    const cached = await getCachedScan(cacheKey);
    if (cached) {
      recordCacheHit();
      logScanCacheEvent(true);
      res.json({ ok: true, result: cached, cached: true });
      return;
    }

    recordCacheMiss();

    // Only billable (cache-missing) calls consume the daily budget.
    if (!consumeScanBudget(identity)) {
      recordBudgetRejection();
      res.status(429).json({ ok: false, error: 'Daily scan budget exceeded' });
      return;
    }

    logScanCacheEvent(false);

    const prompt =
      body.prompt ??
      buildScanPrompt({
        mode,
        text,
        allergens,
        productName: body.productName,
      });

    try {
      const content = await callScanLlm(prompt);
      if (!content) {
        res.status(502).json({ ok: false, error: 'LLM provider unavailable' });
        return;
      }

      const result = parseLlmScanResponse(content, mode, allergens, body.productName);
      if (!result) {
        res.status(502).json({ ok: false, error: 'Invalid LLM response' });
        return;
      }

      await setCachedScan(cacheKey, result);
      res.json({ ok: true, result, cached: false });
    } catch (error) {
      logCaughtError('scan.analyze', error);
      res.status(500).json({ ok: false, error: 'Scan failed' });
    }
  });
}
