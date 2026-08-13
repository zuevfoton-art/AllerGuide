import type { Express, Request, Response } from 'express';
import { requireJwt } from '../middleware/require-jwt';
import { logCaughtError } from '../lib/log-caught-error';
import {
  createProfileForUser,
  deleteProfileForUser,
  getProfileForUser,
  listProfilesForUser,
  updateProfileForUser,
  validateProfilePayload,
} from '../services/profile-service';
import { parseProfileId, parseProfileInput } from './profile-input';

const INVALID_PROFILE_PAYLOAD = 'Invalid profile payload';
const PROFILE_NOT_FOUND = 'Profile not found';

function sendUnexpectedError(
  res: Response,
  context: string,
  error: unknown,
): void {
  logCaughtError(context, error);
  res.status(500).json({ ok: false, error: 'Profile operation failed' });
}

function readProfileId(req: Request, res: Response): number | null {
  const profileId = parseProfileId(req.params.id);
  if (profileId !== null) return profileId;

  res.status(400).json({ ok: false, error: 'Invalid profile id' });
  return null;
}

export function registerProfileRoutes(app: Express) {
  app.get('/api/profiles', requireJwt, async (req: Request, res: Response) => {
    try {
      const items = await listProfilesForUser(req.authUser!.sub);
      res.json({ ok: true, profiles: items });
    } catch (error) {
      sendUnexpectedError(res, 'profiles.list', error);
    }
  });

  app.post('/api/profiles', requireJwt, async (req: Request, res: Response) => {
    const input = parseProfileInput(req.body);
    if (!input) {
      res.status(400).json({ ok: false, error: INVALID_PROFILE_PAYLOAD });
      return;
    }

    const validationError = validateProfilePayload(input);
    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    try {
      const profile = await createProfileForUser(req.authUser!.sub, input);
      res.status(201).json({ ok: true, profile });
    } catch (error) {
      sendUnexpectedError(res, 'profiles.create', error);
    }
  });

  app.get('/api/profiles/:id', requireJwt, async (req: Request, res: Response) => {
    const profileId = readProfileId(req, res);
    if (profileId === null) return;

    try {
      const profile = await getProfileForUser(req.authUser!.sub, profileId);
      if (!profile) {
        res.status(404).json({ ok: false, error: PROFILE_NOT_FOUND });
        return;
      }
      res.json({ ok: true, profile });
    } catch (error) {
      sendUnexpectedError(res, 'profiles.get', error);
    }
  });

  app.patch('/api/profiles/:id', requireJwt, async (req: Request, res: Response) => {
    const profileId = readProfileId(req, res);
    if (profileId === null) return;

    const input = parseProfileInput(req.body);
    if (!input) {
      res.status(400).json({ ok: false, error: INVALID_PROFILE_PAYLOAD });
      return;
    }

    const validationError = validateProfilePayload(input);
    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    try {
      const profile = await updateProfileForUser(req.authUser!.sub, profileId, input);
      if (!profile) {
        res.status(404).json({ ok: false, error: PROFILE_NOT_FOUND });
        return;
      }
      res.json({ ok: true, profile });
    } catch (error) {
      sendUnexpectedError(res, 'profiles.update', error);
    }
  });

  app.delete('/api/profiles/:id', requireJwt, async (req: Request, res: Response) => {
    const profileId = readProfileId(req, res);
    if (profileId === null) return;

    try {
      const deleted = await deleteProfileForUser(req.authUser!.sub, profileId);
      if (!deleted) {
        res.status(404).json({ ok: false, error: PROFILE_NOT_FOUND });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      sendUnexpectedError(res, 'profiles.delete', error);
    }
  });
}
