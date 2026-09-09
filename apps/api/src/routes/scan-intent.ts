import type { Express, Request, Response } from 'express';
import {
  buildScanIntentPrompt,
  resolveScanIntentClassification,
} from '@allerguide/ai';
import { resolveScanIdentity } from '../lib/scan-identity';
import { logCaughtError } from '../lib/log-caught-error';
import { callScanLlm } from '../services/llm-scan-provider';
import { parseScanIntentInput } from './scan-input';

function intentLlmEnabled(): boolean {
  return (
    process.env.YC_SCAN_INTENT_LLM === 'true' && process.env.AI_SCAN_ENABLED === 'true'
  );
}

/** Option B: YandexGPT/OpenAI classifies OCR text → label_or_menu | visual_product. */
export function registerScanIntentRoutes(app: Express) {
  app.post('/api/scan/intent', async (req: Request, res: Response) => {
    if (!intentLlmEnabled()) {
      res.status(503).json({ ok: false, error: 'Scan intent LLM is disabled on this server' });
      return;
    }

    const identity = await resolveScanIdentity(req);
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const input = parseScanIntentInput(req.body);
    if (!input) {
      res.status(400).json({ ok: false, error: 'Invalid scan intent payload' });
      return;
    }

    try {
      const llmRaw = await callScanLlm(buildScanIntentPrompt(input.text));
      const classification = resolveScanIntentClassification({
        extraction: { text: input.text, source: 'vision', warnings: [] },
        fallbackMode: input.fallbackMode,
        llmRaw,
      });

      res.json({
        ok: true,
        intent: classification.intent,
        mode: classification.mode,
        source: classification.source,
      });
    } catch (error) {
      logCaughtError('scan.intent', error);
      res.status(500).json({ ok: false, error: 'Intent classification failed' });
    }
  });
}
