import type { Express, Request, Response } from 'express';
import { validateAuthForm, type LoginType } from '@allerguide/core';
import { signAuthToken } from '../lib/jwt';
import { requireJwt } from '../middleware/require-jwt';
import {
  deleteAppUser,
  findUserById,
  loginAppUser,
  registerAppUser,
  toAuthUser,
} from '../services/app-user-service';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
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

    const token = await signAuthToken({
      sub: result.user.id,
      login: result.user.login,
      loginType: result.user.loginType,
    });

    res.status(201).json({ ok: true, user: result.user, token });
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

    const token = await signAuthToken({
      sub: result.user.id,
      login: result.user.login,
      loginType: result.user.loginType,
    });

    res.json({ ok: true, user: result.user, token });
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
    await deleteAppUser(req.authUser!.sub);
    res.json({ ok: true });
  });
}
