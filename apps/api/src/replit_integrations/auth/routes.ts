import type { Express } from 'express';
import { authStorage } from './storage';
import { isAuthenticated } from './replitAuth';
import { findOrCreateReplitUser, toAuthUser } from '../../services/app-user-service';
import { signAuthToken } from '../../lib/jwt';

export function registerAuthRoutes(app: Express): void {
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.get('/api/auth/replit-exchange', isAuthenticated, async (req: any, res) => {
    try {
      const claims = req.user.claims;
      const user = await findOrCreateReplitUser({ sub: claims.sub });

      if (!user) {
        res.status(500).json({ ok: false, error: 'Failed to create user' });
        return;
      }

      const token = await signAuthToken({
        sub: user.id,
        login: user.login,
        loginType: user.loginType,
      });

      res.json({ ok: true, user: toAuthUser(user), token });
    } catch (error) {
      console.error('Replit exchange error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });
}
