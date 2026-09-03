import type { Express, Request, Response } from 'express';
import { isOverrideAuthRequired, resolveScanIdentity } from '../lib/scan-identity';
import { logCaughtError } from '../lib/log-caught-error';
import {
  recognizeSpeechWithYandexSpeechkit,
  yandexSpeechkitSttConfigured,
  type SpeechkitAudioFormat,
} from '../services/yandex-speechkit-stt';

interface SttRequestBody {
  audioBase64?: string;
  lang?: string;
  format?: SpeechkitAudioFormat;
  sampleRateHertz?: number;
}

/** Phase 3: SpeechKit STT — voice → text for scanner / diary fallback. */
export function registerSttRoutes(app: Express) {
  app.post('/api/stt', async (req: Request, res: Response) => {
    if (!yandexSpeechkitSttConfigured()) {
      res.status(503).json({ ok: false, error: 'SpeechKit STT is disabled on this server' });
      return;
    }

    const identity = await resolveScanIdentity(req, {
      requireAuth: isOverrideAuthRequired(process.env.STT_REQUIRE_AUTH),
    });
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body as SttRequestBody;
    const audioBase64 = body.audioBase64?.trim();
    if (!audioBase64) {
      res.status(400).json({ ok: false, error: 'Missing audioBase64' });
      return;
    }

    const maxChars = Number(process.env.STT_MAX_BASE64_CHARS || 3_000_000);
    if (audioBase64.length > maxChars) {
      res.status(413).json({ ok: false, error: 'Audio too large' });
      return;
    }

    const format = body.format === 'lpcm' ? 'lpcm' : 'oggopus';

    try {
      const text = await recognizeSpeechWithYandexSpeechkit({
        audioBase64,
        lang: body.lang,
        format,
        sampleRateHertz: body.sampleRateHertz,
      });

      if (text === null) {
        res.status(502).json({ ok: false, error: 'STT provider unavailable' });
        return;
      }

      if (!text) {
        res.status(422).json({ ok: false, error: 'No speech recognized', text: '' });
        return;
      }

      res.json({ ok: true, text });
    } catch (error) {
      logCaughtError('stt.recognize', error);
      res.status(500).json({ ok: false, error: 'STT failed' });
    }
  });
}
