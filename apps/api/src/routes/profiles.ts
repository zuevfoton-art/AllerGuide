import type { Express, Request, Response } from 'express';
import { requireJwt } from '../middleware/require-jwt';
import {
  createProfileForUser,
  deleteProfileForUser,
  getProfileForUser,
  listProfilesForUser,
  updateProfileForUser,
  validateProfilePayload,
} from '../services/profile-service';

export function registerProfileRoutes(app: Express) {
  app.get('/api/profiles', requireJwt, async (req: Request, res: Response) => {
    const items = await listProfilesForUser(req.authUser!.sub);
    res.json({ ok: true, profiles: items });
  });

  app.post('/api/profiles', requireJwt, async (req: Request, res: Response) => {
    const body = req.body as {
      name?: string;
      birthYear?: number;
      type?: 'self' | 'child';
      allergies?: string[];
      allergyConfirmations?: Record<string, string>;
      childConsent?: boolean;
      scenario?: 'self' | 'child' | 'both';
    };

    if (!body.name?.trim() || !body.type || !Array.isArray(body.allergies)) {
      res.status(400).json({ ok: false, error: 'Invalid profile payload' });
      return;
    }

    const input = {
      name: body.name.trim(),
      birthYear: Number(body.birthYear) || new Date().getFullYear(),
      type: body.type,
      allergies: body.allergies,
      allergyConfirmations: body.allergyConfirmations,
      childConsent: body.childConsent,
      scenario: body.scenario,
    };

    const validationError = validateProfilePayload(input);
    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    try {
      const profile = await createProfileForUser(req.authUser!.sub, input);
      res.status(201).json({ ok: true, profile });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create profile',
      });
    }
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
    const body = req.body as {
      name?: string;
      birthYear?: number;
      type?: 'self' | 'child';
      allergies?: string[];
      allergyConfirmations?: Record<string, string>;
      childConsent?: boolean;
      scenario?: 'self' | 'child' | 'both';
    };

    if (!body.name?.trim() || !body.type || !Array.isArray(body.allergies)) {
      res.status(400).json({ ok: false, error: 'Invalid profile payload' });
      return;
    }

    const input = {
      name: body.name.trim(),
      birthYear: Number(body.birthYear) || new Date().getFullYear(),
      type: body.type,
      allergies: body.allergies,
      allergyConfirmations: body.allergyConfirmations,
      childConsent: body.childConsent,
      scenario: body.scenario,
    };

    const validationError = validateProfilePayload(input);
    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    try {
      const profile = await updateProfileForUser(req.authUser!.sub, profileId, input);
      if (!profile) {
        res.status(404).json({ ok: false, error: 'Profile not found' });
        return;
      }
      res.json({ ok: true, profile });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
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
