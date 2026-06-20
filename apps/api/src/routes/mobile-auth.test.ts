import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

vi.mock('../services/app-user-service', () => ({
  registerAppUser: vi.fn(),
  loginAppUser: vi.fn(),
  findUserById: vi.fn(),
  deleteAppUser: vi.fn(),
  toAuthUser: vi.fn((row: { id: number; login: string; loginType: string }) => ({
    id: row.id,
    login: row.login,
    loginType: row.loginType,
  })),
}));

vi.mock('../services/profile-service', () => ({
  listProfilesForUser: vi.fn(),
  createProfileForUser: vi.fn(),
  getProfileForUser: vi.fn(),
  updateProfileForUser: vi.fn(),
  deleteProfileForUser: vi.fn(),
}));

import {
  registerAppUser,
  loginAppUser,
  findUserById,
} from '../services/app-user-service';
import { listProfilesForUser, createProfileForUser } from '../services/profile-service';
import { signAuthToken } from '../lib/jwt';

describe('mobile auth routes', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    process.env.JWT_SECRET = 'test-secret-key-with-enough-length';
    vi.clearAllMocks();
  });

  it('registers user and returns token', async () => {
    vi.mocked(registerAppUser).mockResolvedValue({
      ok: true,
      user: { id: 1, login: 'user@example.com', loginType: 'email' },
    });

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).post('/api/auth/register').send({
      loginType: 'email',
      login: 'user@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
    });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.user.id).toBe(1);
  });

  it('logs in user and returns token', async () => {
    vi.mocked(loginAppUser).mockResolvedValue({
      ok: true,
      user: { id: 2, login: '+79991234567', loginType: 'phone' },
    });

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).post('/api/auth/login').send({
      loginType: 'phone',
      login: '+79991234567',
      password: 'secret1',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.loginType).toBe('phone');
  });

  it('returns current user with bearer token', async () => {
    vi.mocked(findUserById).mockResolvedValue({
      id: 3,
      login: 'user@example.com',
      loginType: 'email',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await signAuthToken({
      sub: 3,
      login: 'user@example.com',
      loginType: 'email',
    });

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(3);
  });
});

describe('profile routes', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    process.env.JWT_SECRET = 'test-secret-key-with-enough-length';
    vi.clearAllMocks();
  });

  it('lists profiles for authenticated user', async () => {
    vi.mocked(listProfilesForUser).mockResolvedValue([
      {
        id: 10,
        userId: 5,
        name: 'Anna',
        birthYear: 1990,
        type: 'self',
        allergies: '[]',
      },
    ]);

    const token = await signAuthToken({
      sub: 5,
      login: 'user@example.com',
      loginType: 'email',
    });

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .get('/api/profiles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.profiles).toHaveLength(1);
  });

  it('creates profile for authenticated user', async () => {
    vi.mocked(createProfileForUser).mockResolvedValue({
      id: 11,
      userId: 5,
      name: 'Misha',
      birthYear: 2015,
      type: 'child',
      allergies: '["Молоко"]',
    });

    const token = await signAuthToken({
      sub: 5,
      login: 'user@example.com',
      loginType: 'email',
    });

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Misha',
        birthYear: 2015,
        type: 'child',
        allergies: ['Молоко'],
      });

    expect(response.status).toBe(201);
    expect(response.body.profile.name).toBe('Misha');
  });
});
