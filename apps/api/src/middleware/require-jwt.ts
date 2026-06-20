import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../lib/jwt';

export async function requireJwt(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = await verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    return;
  }

  req.authUser = payload;
  next();
}
