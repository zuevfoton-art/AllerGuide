import type { NextFunction, Request, Response } from 'express';
import { resolveAuthPayload } from '../lib/request-auth';

export async function requireJwt(req: Request, res: Response, next: NextFunction) {
  const payload = await resolveAuthPayload(req);
  if (!payload) {
    res.status(401).json({
      ok: false,
      error: req.header('authorization') || req.headers.cookie
        ? 'Invalid or expired token'
        : 'Unauthorized',
    });
    return;
  }

  req.authUser = payload;
  next();
}
