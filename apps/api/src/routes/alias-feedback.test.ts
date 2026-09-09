import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const persistAliasFeedback = vi.fn(async (input: { term: string }) => ({
  id: 'fb-1',
  term: input.term,
  status: 'pending',
  createdAt: new Date().toISOString(),
}));

vi.mock('../services/alias-feedback-service', () => ({
  persistAliasFeedback: (input: { term: string }) => persistAliasFeedback(input),
  listPendingAliasFeedbackDb: vi.fn(async () => []),
  updateAliasFeedbackStatus: vi.fn(),
}));

describe('alias-feedback routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALIAS_FEEDBACK_ADMIN_KEY;
  });

  it('strips profileId and scanInput from a public POST', async () => {
    const app = await createApp();
    const response = await request(app).post('/api/alias-feedback').send({
      term: 'казеин',
      context: 'scanner',
      profileId: 42,
      scanInput: 'молоко, казеин, сливки',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: 'fb-1' });
    expect(persistAliasFeedback).toHaveBeenCalledWith({
      term: 'казеин',
      suggestedAllergenId: undefined,
      context: 'scanner',
    });
  });

  it('rejects listing without the admin key', async () => {
    const app = await createApp();
    const response = await request(app).get('/api/alias-feedback');
    expect(response.status).toBe(401);
  });
});
