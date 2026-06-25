import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerTranscribeRoutes } from './transcribe';

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns 503 when disabled', async () => {
    vi.stubEnv('VOICE_TRANSCRIBE_ENABLED', 'false');
    const app = express();
    registerTranscribeRoutes(app);

    const res = await request(app)
      .post('/api/transcribe')
      .send({ audioBase64: Buffer.from('test').toString('base64') });

    expect(res.status).toBe(503);
  });

  it('returns 400 when audio missing', async () => {
    vi.stubEnv('VOICE_TRANSCRIBE_ENABLED', 'true');
    const app = express();
    registerTranscribeRoutes(app);

    const res = await request(app).post('/api/transcribe').send({});

    expect(res.status).toBe(400);
  });
});
