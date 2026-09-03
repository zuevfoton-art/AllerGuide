import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

vi.mock('../services/refresh-token-service', () => ({
  issueRefreshToken: vi.fn(async () => 'refresh-test'),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeRefreshTokensForUser: vi.fn(),
}));

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
  validateProfilePayload: vi.fn(() => null),
}));

import {
  registerAppUser,
  loginAppUser,
  findUserById,
} from '../services/app-user-service';
import { rotateRefreshToken } from '../services/refresh-token-service';
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

    const app = await createApp();
    const response = await request(app).post('/api/auth/register').send({
      loginType: 'email',
      login: 'user@example.com',
      password: 'secret12',
      confirmPassword: 'secret12',
    });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.refreshToken).toBe('refresh-test');
    expect(response.body.expiresIn).toBeGreaterThan(0);
    expect(response.body.user.id).toBe(1);
  });

  it('logs in user and returns token', async () => {
    vi.mocked(loginAppUser).mockResolvedValue({
      ok: true,
      user: { id: 2, login: '+79991234567', loginType: 'phone' },
    });

    const app = await createApp();
    const response = await request(app).post('/api/auth/login').send({
      loginType: 'phone',
      login: '+79991234567',
      password: 'secret12',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.loginType).toBe('phone');
    expect(response.body.refreshToken).toBe('refresh-test');
  });

  it('returns current user with bearer token', async () => {
    vi.mocked(findUserById).mockResolvedValue({
      id: 3,
      login: 'user@example.com',
      loginType: 'email',
      email: 'user@example.com',
      phone: null,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await signAuthToken({
      sub: 3,
      login: 'user@example.com',
      loginType: 'email',
    });

    const app = await createApp();
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(3);
  });

  it('rotates a refresh token into a new access session', async () => {
    vi.mocked(rotateRefreshToken).mockResolvedValue({ userId: 3 });
    vi.mocked(findUserById).mockResolvedValue({
      id: 3,
      login: 'user@example.com',
      loginType: 'email',
      email: 'user@example.com',
      phone: null,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = await createApp();
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'refresh-old' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.refreshToken).toBe('refresh-test');
  });

  it('revokes the presented refresh token on logout', async () => {
    const { revokeRefreshToken } = await import('../services/refresh-token-service');

    const app = await createApp();
    const response = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'refresh-test' });

    expect(response.status).toBe(200);
    expect(revokeRefreshToken).toHaveBeenCalledWith('refresh-test');
  });

  it('sets httpOnly cookies and omits the refresh token for a browser Origin', async () => {
    vi.mocked(registerAppUser).mockResolvedValue({
      ok: true,
      user: { id: 1, login: 'user@example.com', loginType: 'email' },
    });

    const app = await createApp();
    const response = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:5000')
      .send({
        loginType: 'email',
        login: 'user@example.com',
        password: 'secret12',
        confirmPassword: 'secret12',
      });

    expect(response.status).toBe(201);
    expect(response.body.refreshToken).toBeUndefined();
    expect(response.body.token).toBeTypeOf('string');
    const rawCookies = response.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    expect(cookies.some((value) => value.includes('ag_refresh=') && /httponly/i.test(value))).toBe(
      true,
    );
    expect(cookies.some((value) => value.includes('ag_access=') && /httponly/i.test(value))).toBe(
      true,
    );
  });

  it('refreshes from an httpOnly cookie when the body has no refresh token', async () => {
    vi.mocked(rotateRefreshToken).mockResolvedValue({ userId: 3 });
    vi.mocked(findUserById).mockResolvedValue({
      id: 3,
      login: 'user@example.com',
      loginType: 'email',
      email: 'user@example.com',
      phone: null,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = await createApp();
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5000')
      .set('Cookie', 'ag_refresh=refresh-old')
      .send({});

    expect(response.status).toBe(200);
    expect(rotateRefreshToken).toHaveBeenCalledWith('refresh-old');
    expect(response.body.refreshToken).toBeUndefined();
  });

  it('rejects a missing refresh token', async () => {
    const app = await createApp();
    const response = await request(app).post('/api/auth/refresh').send({});
    expect(response.status).toBe(400);
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

    const app = await createApp();
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

    const app = await createApp();
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
