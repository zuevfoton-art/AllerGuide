import type { Express, Request, Response } from 'express';
import { requireJwt } from '../middleware/require-jwt';
import {
  createProfileForUser,
  deleteProfileForUser,
  getProfileForUser,
  listProfilesForUser,
  updateProfileForUser,
} from '../services/profile-service';

export function registerProfileRoutes(app: Express) {
  app.get('/api/profiles', requireJwt, async (req: Request, res: Response) => {
    const items = await listProfilesForUser(req.authUser!.sub);
    res.json({ ok: true, profiles: items });
  });

  app.post('/api/profiles', requireJwt, async (req: Request, res: Response) => {
    const { name, birthYear, type, allergies } = req.body as {
      name?: string;
      birthYear?: number;
      type?: 'self' | 'child';
      allergies?: string[];
    };

    if (!name?.trim() || !type || !Array.isArray(allergies)) {
      res.status(400).json({ ok: false, error: 'Invalid profile payload' });
      return;
    }

    const profile = await createProfileForUser(req.authUser!.sub, {
      name: name.trim(),
      birthYear: Number(birthYear) || new Date().getFullYear(),
      type,
      allergies,
    });

    res.status(201).json({ ok: true, profile });
  });

  app.get('/api/profiles/:id', requireJwt, async (req: Request, res: Response) => {
    const profileId = Number(req.params.id);
    const profile = await getProfileForUser(req.authUser!.sub, profileId);
    if (!profile) {
      res.status(404).json({ ok: false, error: 'Profile not found' });
      return;
    }
    res.json({ ok: true, profile });
  });

  app.patch('/api/profiles/:id', requireJwt, async (req: Request, res: Response) => {
    const profileId = Number(req.params.id);
    const { name, birthYear, type, allergies } = req.body as {
      name?: string;
      birthYear?: number;
      type?: 'self' | 'child';
      allergies?: string[];
    };

    if (!name?.trim() || !type || !Array.isArray(allergies)) {
      res.status(400).json({ ok: false, error: 'Invalid profile payload' });
      return;
    }

    const profile = await updateProfileForUser(req.authUser!.sub, profileId, {
      name: name.trim(),
      birthYear: Number(birthYear) || new Date().getFullYear(),
      type,
      allergies,
    });

    if (!profile) {
      res.status(404).json({ ok: false, error: 'Profile not found' });
      return;
    }

    res.json({ ok: true, profile });
  });

  app.delete('/api/profiles/:id', requireJwt, async (req: Request, res: Response) => {
    const profileId = Number(req.params.id);
    const deleted = await deleteProfileForUser(req.authUser!.sub, profileId);
    if (!deleted) {
      res.status(404).json({ ok: false, error: 'Profile not found' });
      return;
    }
    res.json({ ok: true });
  });
}
