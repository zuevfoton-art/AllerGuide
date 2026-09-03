import type { Express, Request, Response } from 'express';
import { isOverrideAuthRequired, resolveScanIdentity } from '../lib/scan-identity';
import { logCaughtError } from '../lib/log-caught-error';
import {
  recognizeTextWithYandexVision,
  yandexVisionOcrConfigured,
} from '../services/yandex-vision-ocr';

interface OcrRequestBody {
  imageBase64?: string;
  mimeType?: string;
  languageCodes?: string[];
}

export function registerOcrRoutes(app: Express) {
  app.post('/api/ocr', async (req: Request, res: Response) => {
    if (!yandexVisionOcrConfigured()) {
      res.status(503).json({ ok: false, error: 'Vision OCR is disabled on this server' });
      return;
    }

    const identity = await resolveScanIdentity(req, {
      requireAuth: isOverrideAuthRequired(process.env.OCR_REQUIRE_AUTH),
    });
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body as OcrRequestBody;
    const imageBase64 = body.imageBase64?.trim();
    if (!imageBase64) {
      res.status(400).json({ ok: false, error: 'Missing imageBase64' });
      return;
    }

    // Guard oversized payloads (base64 ≈ 4/3 of binary size).
    const maxChars = Number(process.env.OCR_MAX_BASE64_CHARS || 6_000_000);
    if (imageBase64.length > maxChars) {
      res.status(413).json({ ok: false, error: 'Image too large' });
      return;
    }

    try {
      const result = await recognizeTextWithYandexVision({
        imageBase64,
        mimeType: body.mimeType,
        languageCodes: Array.isArray(body.languageCodes)
          ? body.languageCodes.map(String)
          : undefined,
      });

      if (!result) {
        res.status(502).json({ ok: false, error: 'OCR provider unavailable' });
        return;
      }

      if (!result.text) {
        res.status(422).json({
          ok: false,
          error: 'No text recognized',
          text: '',
        });
        return;
      }

      res.json({
        ok: true,
        text: result.text,
        fullText: result.fullText,
      });
    } catch (error) {
      logCaughtError('ocr.recognize', error);
      res.status(500).json({ ok: false, error: 'OCR failed' });
    }
  });
}
