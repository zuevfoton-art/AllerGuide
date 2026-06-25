import type { Express, Request, Response } from 'express';
import express from 'express';
import { resolveWhisperLanguage } from '@allerguide/ai';
import { verifyAuthToken } from '../lib/jwt';

interface TranscribeBody {
  audioBase64?: string;
  mimeType?: string;
  locale?: string;
}

function isTranscribeEnabled(): boolean {
  return process.env.VOICE_TRANSCRIBE_ENABLED === 'true';
}

function requireTranscribeAuth(): boolean {
  return process.env.TRANSCRIBE_REQUIRE_AUTH === 'true';
}

async function resolveTranscribeIdentity(req: Request): Promise<string | null> {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const payload = await verifyAuthToken(header.slice('Bearer '.length).trim());
    if (payload) return `user:${payload.sub}`;
  }
  if (requireTranscribeAuth()) return null;
  return `ip:${req.ip ?? 'unknown'}`;
}

async function callWhisperTranscription(input: {
  audio: Buffer;
  mimeType: string;
  locale?: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_WHISPER_MODEL || 'whisper-1';

  if (!apiKey) return null;

  const extension = input.mimeType.includes('webm')
    ? 'webm'
    : input.mimeType.includes('mp4') || input.mimeType.includes('m4a')
      ? 'm4a'
      : 'audio';

  const form = new FormData();
  form.append('model', model);
  form.append(
    'file',
    new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
    `note.${extension}`,
  );
  if (input.locale) {
    form.append('language', resolveWhisperLanguage(input.locale));
  }

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() ?? null;
}

export function registerTranscribeRoutes(app: Express) {
  app.post(
    '/api/transcribe',
    express.json({ limit: '8mb' }),
    async (req: Request, res: Response) => {
      if (!isTranscribeEnabled()) {
        res.status(503).json({ ok: false, error: 'Voice transcription is disabled on this server' });
        return;
      }

      const identity = await resolveTranscribeIdentity(req);
      if (!identity) {
        res.status(401).json({ ok: false, error: 'Unauthorized' });
        return;
      }

      const body = req.body as TranscribeBody;
      const audioBase64 = body.audioBase64?.trim();
      const mimeType = body.mimeType?.trim() || 'audio/m4a';

      if (!audioBase64) {
        res.status(400).json({ ok: false, error: 'Missing audioBase64' });
        return;
      }

      let audio: Buffer;
      try {
        audio = Buffer.from(audioBase64, 'base64');
      } catch {
        res.status(400).json({ ok: false, error: 'Invalid audio payload' });
        return;
      }

      if (audio.length === 0) {
        res.status(400).json({ ok: false, error: 'Empty audio payload' });
        return;
      }

      try {
        const text = await callWhisperTranscription({
          audio,
          mimeType,
          locale: body.locale,
        });

        if (!text) {
          res.status(502).json({ ok: false, error: 'Transcription provider unavailable' });
          return;
        }

        res.json({ ok: true, text });
      } catch {
        res.status(500).json({ ok: false, error: 'Transcription failed' });
      }
    },
  );
}
