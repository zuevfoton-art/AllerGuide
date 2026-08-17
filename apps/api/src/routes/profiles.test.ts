import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/jwt';

vi.mock('../services/profile-service', () => ({
  listProfilesForUser: vi.fn(),
  createProfileForUser: vi.fn(),
  getProfileForUser: vi.fn(),
  updateProfileForUser: vi.fn(),
  deleteProfileForUser: vi.fn(),
  validateProfilePayload: vi.fn(() => null),
}));

import {
  createProfileForUser,
  deleteProfileForUser,
  getProfileForUser,
  listProfilesForUser,
} from '../services/profile-service';

const JWT_SECRET = 'profile-routes-test-secret-at-least-32-characters';

async function authorizedRequest() {
  const token = await signAuthToken({
    sub: 7,
    login: 'profile@example.com',
    loginType: 'email',
  });
  const app = await createApp();
  return { app, token };
}

describe('profile routes', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.RATE_LIMIT_DISABLED = 'true';
    vi.clearAllMocks();
  });

  it('rejects malformed profile ids before calling the service', async () => {
    const { app, token } = await authorizedRequest();
    const response = await request(app)
      .get('/api/profiles/not-a-number')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ ok: false, error: 'Invalid profile id' });
    expect(getProfileForUser).not.toHaveBeenCalled();
  });

  it('rejects malformed payloads without coercing birthYear', async () => {
    const { app, token } = await authorizedRequest();
    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Анна', birthYear: '1990', type: 'self', allergies: ['milk'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid profile payload');
    expect(createProfileForUser).not.toHaveBeenCalled();
  });

  it('does not expose service errors to clients', async () => {
    vi.mocked(listProfilesForUser).mockRejectedValue(new Error('database password leaked'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { app, token } = await authorizedRequest();
    const response = await request(app)
      .get('/api/profiles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ ok: false, error: 'Profile operation failed' });
    expect(JSON.stringify(response.body)).not.toContain('database password');
    consoleError.mockRestore();
  });

  it('keeps delete scoped to the authenticated user', async () => {
    vi.mocked(deleteProfileForUser).mockResolvedValue(true);
    const { app, token } = await authorizedRequest();
    const response = await request(app)
      .delete('/api/profiles/12')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(deleteProfileForUser).toHaveBeenCalledWith(7, 12);
  });
});
