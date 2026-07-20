import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

vi.mock('../services/app-user-service', () => ({
  registerAppUser: vi.fn(),
  loginAppUser: vi.fn(),
  findUserById: vi.fn(),
  findUserByLogin: vi.fn(),
  deleteAppUser: vi.fn(),
  createPasswordResetToken: vi.fn(),
  findValidResetToken: vi.fn(),
  consumeResetToken: vi.fn(),
  toAuthUser: vi.fn((row: { id: number; login: string; loginType: string }) => ({
    id: row.id,
    login: row.login,
    loginType: row.loginType,
  })),
}));

vi.mock('../lib/email-service', () => ({
  sendPasswordResetEmail: vi.fn(),
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
  findUserByLogin,
  createPasswordResetToken,
  findValidResetToken,
  consumeResetToken,
} from '../services/app-user-service';
import { sendPasswordResetEmail } from '../lib/email-service';
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

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(3);
  });

  it('forgot-password creates token and sends email for email accounts', async () => {
    vi.mocked(findUserByLogin).mockResolvedValue({
      id: 7,
      login: 'user@example.com',
      loginType: 'email',
      email: 'user@example.com',
      phone: null,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(createPasswordResetToken).mockResolvedValue('reset-token-abc');
    vi.mocked(sendPasswordResetEmail).mockResolvedValue(true);
    delete process.env.PASSWORD_RESET_TOKEN_IN_RESPONSE;

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).post('/api/auth/forgot-password').send({
      loginType: 'email',
      login: 'user@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.resetToken).toBeUndefined();
    expect(createPasswordResetToken).toHaveBeenCalledWith(7);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', 'reset-token-abc');
  });

  it('forgot-password does not leak existence for unknown or phone logins', async () => {
    vi.mocked(findUserByLogin).mockResolvedValue(null);

    const app = await createApp({ withReplitAuth: false });
    const unknown = await request(app).post('/api/auth/forgot-password').send({
      loginType: 'email',
      login: 'missing@example.com',
    });
    expect(unknown.status).toBe(200);
    expect(unknown.body.ok).toBe(true);
    expect(createPasswordResetToken).not.toHaveBeenCalled();

    vi.mocked(findUserByLogin).mockResolvedValue({
      id: 8,
      login: '+79991234567',
      loginType: 'phone',
      email: null,
      phone: '+79991234567',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const phone = await request(app).post('/api/auth/forgot-password').send({
      loginType: 'phone',
      login: '+79991234567',
    });
    expect(phone.status).toBe(200);
    expect(phone.body.ok).toBe(true);
    expect(createPasswordResetToken).not.toHaveBeenCalled();
  });

  it('verify-reset-token and reset-password consume a valid token', async () => {
    vi.mocked(findValidResetToken).mockResolvedValue({
      id: 1,
      userId: 7,
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(consumeResetToken).mockResolvedValue(true);

    const app = await createApp({ withReplitAuth: false });
    const verify = await request(app).get('/api/auth/verify-reset-token').query({ token: 'valid-token' });
    expect(verify.status).toBe(200);
    expect(verify.body.ok).toBe(true);

    const reset = await request(app).post('/api/auth/reset-password').send({
      token: 'valid-token',
      password: 'newpass1',
      confirmPassword: 'newpass1',
    });
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);
    expect(consumeResetToken).toHaveBeenCalledWith('valid-token', 'newpass1');
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
