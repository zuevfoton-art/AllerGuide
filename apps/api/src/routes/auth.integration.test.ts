import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import {
  applyIntegrationDefaults,
  hasIntegrationDatabase,
  resetProfileData,
  uniqueLogin,
} from '../test/integration-harness';
import { closeDb } from '../db';

describe.skipIf(!hasIntegrationDatabase)('auth flow integration (P1.6a)', () => {
  beforeAll(() => {
    applyIntegrationDefaults();
  });

  afterEach(async () => {
    await resetProfileData();
  });

  afterAll(() => {
    closeDb();
  });

  it('registers, logs in, and returns /me for the same user', async () => {
    const app = await createApp({ withReplitAuth: false });
    const login = uniqueLogin('auth');
    const password = 'TestPass1!';

    const register = await request(app).post('/api/auth/register').send({
      loginType: 'email',
      login,
      password,
      confirmPassword: password,
    });
    expect(register.status).toBe(201);
    expect(register.body.token).toBeTypeOf('string');
    const userId = register.body.user.id;

    const loginRes = await request(app).post('/api/auth/login').send({
      loginType: 'email',
      login,
      password,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTypeOf('string');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(userId);
    expect(me.body.user.login).toBe(login);
  });

  it('rejects duplicate registration', async () => {
    const app = await createApp({ withReplitAuth: false });
    const login = uniqueLogin('dup');
    const password = 'TestPass1!';
    const payload = {
      loginType: 'email' as const,
      login,
      password,
      confirmPassword: password,
    };

    const first = await request(app).post('/api/auth/register').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/auth/register').send(payload);
    expect(second.status).toBe(409);
    expect(second.body.ok).toBe(false);
  });
});
