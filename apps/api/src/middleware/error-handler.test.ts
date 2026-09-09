import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { registerErrorHandler } from './error-handler';

describe('registerErrorHandler', () => {
  it('returns JSON 500 for errors passed to next(err)', async () => {
    const app = express();
    app.get('/boom', (_req, _res, next) => {
      next(new Error('intentional'));
    });
    registerErrorHandler(app);

    const response = await request(app).get('/boom');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ ok: false, error: 'Internal server error' });
  });
});
