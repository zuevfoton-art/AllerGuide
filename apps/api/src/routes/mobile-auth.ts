import type { Express, Request, Response } from 'express';
import { validateAuthForm, normalizeLogin, type LoginType } from '@allerguide/core';
import { getAccessTokenTtlSeconds, signAuthToken, verifyAuthToken } from '../lib/jwt';
import { requireJwt } from '../middleware/require-jwt';
import {
  issueRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokensForUser,
  rotateRefreshToken,
} from '../services/refresh-token-service';
import {
  consumeResetToken,
  createPasswordResetToken,
  deleteAppUser,
  findUserById,
  findUserByLogin,
  findValidResetToken,
  loginAppUser,
  registerAppUser,
  toAuthUser,
} from '../services/app-user-service';
import { sendPasswordResetEmail } from '../lib/email-service';
import { listProfilesForUser } from '../services/profile-service';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
}

function passwordResetTokenInResponseEnabled(): boolean {
  return process.env.PASSWORD_RESET_TOKEN_IN_RESPONSE === 'true';
}

async function issueAuthSession(user: { id: number; login: string; loginType: string }) {
  const token = await signAuthToken({
    sub: user.id,
    login: user.login,
    loginType: user.loginType,
  });
  const refreshToken = await issueRefreshToken(user.id);
  return { token, refreshToken, expiresIn: getAccessTokenTtlSeconds() };
}

export function registerMobileAuthRoutes(app: Express) {
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Auth database is not configured' });
      return;
    }

    const { loginType, login, password, confirmPassword } = req.body as {
      loginType?: LoginType;
      login?: string;
      password?: string;
      confirmPassword?: string;
    };

    const validationError = validateAuthForm({
      loginType: loginType ?? 'email',
      login: login ?? '',
      password: password ?? '',
      confirmPassword: confirmPassword ?? password ?? '',
    });

    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    const result = await registerAppUser({
      loginType: loginType!,
      login: login!,
      password: password!,
    });

    if (!result.ok) {
      res.status(409).json(result);
      return;
    }

    const session = await issueAuthSession(result.user);
    res.status(201).json({ ok: true, user: result.user, ...session });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Auth database is not configured' });
      return;
    }

    const { loginType, login, password } = req.body as {
      loginType?: LoginType;
      login?: string;
      password?: string;
    };

    const validationError = validateAuthForm({
      loginType: loginType ?? 'email',
      login: login ?? '',
      password: password ?? '',
    });

    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    const result = await loginAppUser({
      loginType: loginType!,
      login: login!,
      password: password!,
    });

    if (!result.ok) {
      res.status(401).json({ ok: false, error: result.error });
      return;
    }

    const session = await issueAuthSession(result.user);
    res.json({ ok: true, user: result.user, ...session });
  });

  app.get('/api/auth/me', requireJwt, async (req: Request, res: Response) => {
    const user = await findUserById(req.authUser!.sub);
    if (!user) {
      res.status(404).json({ ok: false, error: 'User not found' });
      return;
    }

    res.json({ ok: true, user: toAuthUser(user) });
  });

  app.delete('/api/auth/account', requireJwt, async (req: Request, res: Response) => {
    await revokeRefreshTokensForUser(req.authUser!.sub);
    await deleteAppUser(req.authUser!.sub);
    res.json({ ok: true });
  });

  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Auth database is not configured' });
      return;
    }

    const refreshToken = String((req.body as { refreshToken?: string })?.refreshToken ?? '').trim();
    if (!refreshToken) {
      res.status(400).json({ ok: false, error: 'refreshToken is required' });
      return;
    }

    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      res.status(401).json({ ok: false, error: 'Invalid or expired refresh token' });
      return;
    }

    const user = await findUserById(rotated.userId);
    if (!user) {
      res.status(401).json({ ok: false, error: 'Invalid or expired refresh token' });
      return;
    }

    const session = await issueAuthSession(toAuthUser(user));
    res.json({ ok: true, user: toAuthUser(user), ...session });
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    const refreshToken = String((req.body as { refreshToken?: string })?.refreshToken ?? '').trim();
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    const header = req.header('authorization');
    if (header?.startsWith('Bearer ')) {
      const payload = await verifyAuthToken(header.slice('Bearer '.length).trim());
      if (payload) await revokeRefreshTokensForUser(payload.sub);
    }

    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Auth database is not configured' });
      return;
    }

    const { login, loginType } = req.body as { login?: string; loginType?: LoginType };
    if (!login || !loginType) {
      res.status(400).json({ ok: false, error: 'login and loginType are required' });
      return;
    }

    const normalized = normalizeLogin(loginType, login);
    const user = await findUserByLogin(normalized);

    if (!user || (loginType !== 'email')) {
      res.json({ ok: true });
      return;
    }

    const resetToken = await createPasswordResetToken(user.id);
    if (passwordResetTokenInResponseEnabled()) {
      res.json({ ok: true, resetToken });
      return;
    }

    const sent = await sendPasswordResetEmail(normalized, resetToken);
    if (!sent && process.env.NODE_ENV !== 'production') {
      console.warn('[auth] Password reset email not sent — configure RESEND_API_KEY');
    }

    res.json({ ok: true });
  });

  app.get('/api/auth/export', requireJwt, async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Auth database is not configured' });
      return;
    }

    const user = await findUserById(req.authUser!.sub);
    if (!user) {
      res.status(404).json({ ok: false, error: 'User not found' });
      return;
    }

    const profiles = await listProfilesForUser(req.authUser!.sub);
    res.json({
      ok: true,
      exportedAt: new Date().toISOString(),
      user: toAuthUser(user),
      profiles,
      note: 'Diary and scan history are stored locally or in encrypted cloud backup (zero-knowledge).',
    });
  });

  app.get('/api/auth/verify-reset-token', async (req: Request, res: Response) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).json({ ok: false, error: 'token is required' });
      return;
    }
    const row = await findValidResetToken(token);
    if (!row) {
      res.status(400).json({ ok: false, error: 'Ссылка недействительна или истекла.' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Auth database is not configured' });
      return;
    }

    const { token, password, confirmPassword } = req.body as {
      token?: string;
      password?: string;
      confirmPassword?: string;
    };

    if (!token || !password || !confirmPassword) {
      res.status(400).json({ ok: false, error: 'token, password и confirmPassword обязательны.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ ok: false, error: 'Пароль должен содержать минимум 6 символов.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ ok: false, error: 'Пароли не совпадают.' });
      return;
    }

    const success = await consumeResetToken(token, password);
    if (!success) {
      res.status(400).json({ ok: false, error: 'Ссылка недействительна или истекла.' });
      return;
    }

    res.json({ ok: true });
  });
}
