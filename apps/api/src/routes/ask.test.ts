import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callScanLlm } from '../services/llm-scan-provider';
import { parseAskInput, registerAskRoutes } from './ask';
import { resetScanState } from '../lib/scan-cache';

vi.mock('../services/llm-scan-provider', () => ({
  callScanLlm: vi.fn(async () => '{"answer":"Пыльца высокая, прогулку лучше сократить."}'),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  registerAskRoutes(app);
  return app;
}

describe('parseAskInput', () => {
  it('accepts a question with locale, context and history', () => {
    expect(
      parseAskInput({
        question: '  Можно гулять?  ',
        locale: 'ru',
        context: ['Пыльца: много'],
        history: [{ role: 'assistant', text: 'Вчера было спокойно.' }],
      }),
    ).toEqual({
      question: 'Можно гулять?',
      locale: 'ru',
      context: ['Пыльца: много'],
      history: [{ role: 'assistant', text: 'Вчера было спокойно.' }],
    });
  });

  it('rejects malformed payloads', () => {
    expect(parseAskInput(null)).toBeNull();
    expect(parseAskInput({ question: '   ' })).toBeNull();
    expect(parseAskInput({ question: 'a'.repeat(501) })).toBeNull();
    expect(parseAskInput({ question: 'ok', locale: 'russian' })).toBeNull();
    expect(parseAskInput({ question: 'ok', context: 'нет' })).toBeNull();
    expect(parseAskInput({ question: 'ok', history: [{ role: 'system', text: 'x' }] })).toBeNull();
  });
});

describe('POST /api/ask', () => {
  beforeEach(() => {
    process.env.AI_CHAT_ENABLED = 'true';
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.SCAN_REQUIRE_AUTH = 'false';
    process.env.SCAN_DAILY_BUDGET = '100';
    resetScanState();
    vi.mocked(callScanLlm).mockClear();
  });

  afterEach(() => {
    delete process.env.AI_CHAT_ENABLED;
    delete process.env.AI_SCAN_ENABLED;
    delete process.env.SCAN_REQUIRE_AUTH;
    delete process.env.SCAN_DAILY_BUDGET;
  });

  it('returns 503 when the chat flag is off', async () => {
    process.env.AI_CHAT_ENABLED = 'false';

    const response = await request(buildApp()).post('/api/ask').send({ question: 'Можно гулять?' });

    expect(response.status).toBe(503);
  });

  it('rejects an invalid payload', async () => {
    const response = await request(buildApp()).post('/api/ask').send({ question: '' });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it('hands distress wording to the crisis screen without calling the model', async () => {
    const response = await request(buildApp())
      .post('/api/ask')
      .send({ question: 'Я задыхаюсь, что делать' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, handoff: 'sos' });
    expect(callScanLlm).not.toHaveBeenCalled();
  });

  it('answers an ordinary question', async () => {
    const response = await request(buildApp())
      .post('/api/ask')
      .send({ question: 'Можно гулять?', locale: 'ru', context: ['Пыльца: много'] });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.answer).toContain('Пыльца высокая');
    expect(callScanLlm).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when the provider gives nothing usable', async () => {
    vi.mocked(callScanLlm).mockResolvedValueOnce(null);

    const response = await request(buildApp()).post('/api/ask').send({ question: 'Можно гулять?' });

    expect(response.status).toBe(502);
    expect(response.body.ok).toBe(false);
  });

  it('does not consume the daily budget for a distress handoff', async () => {
    process.env.SCAN_DAILY_BUDGET = '1';
    const app = buildApp();

    const distress = await request(app).post('/api/ask').send({ question: 'Я задыхаюсь, что делать' });
    expect(distress.status).toBe(200);
    expect(callScanLlm).not.toHaveBeenCalled();

    const ordinary = await request(app).post('/api/ask').send({ question: 'Можно гулять?' });
    expect(ordinary.status).toBe(200);
    expect(callScanLlm).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when the shared daily LLM budget is exhausted', async () => {
    process.env.SCAN_DAILY_BUDGET = '1';
    const app = buildApp();

    await request(app).post('/api/ask').send({ question: 'Можно гулять?' });
    const blocked = await request(app).post('/api/ask').send({ question: 'А вечером?' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('Daily scan budget exceeded');
    expect(callScanLlm).toHaveBeenCalledTimes(1);
  });
});
