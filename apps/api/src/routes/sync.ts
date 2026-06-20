import type { Express, NextFunction, Request, Response } from 'express';

interface SyncPayload {
  v: 1 | 2;
  userId: number;
  exportedAt: string;
  profiles: unknown[];
  diaryEntries: unknown[];
  emergencyContacts: unknown[];
  scanHistory?: unknown[];
  profileSos?: unknown[];
  appSettings?: Record<string, string>;
}

const backups = new Map<number, SyncPayload>();

function isSyncEnabled(): boolean {
  return process.env.SYNC_ENABLED === 'true';
}

function requireSyncAccess(req: Request, res: Response, next: NextFunction) {
  if (!isSyncEnabled()) {
    res.status(503).json({ ok: false, error: 'Sync is disabled on this server' });
    return;
  }

  const configuredKey = process.env.SYNC_API_KEY;
  if (configuredKey) {
    const provided = req.header('x-sync-api-key');
    if (provided !== configuredKey) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
  }

  next();
}

export function registerSyncRoutes(app: Express) {
  app.use('/api/sync', requireSyncAccess);

  app.post('/api/sync/backup', (req: Request, res: Response) => {
    const payload = req.body as SyncPayload;
    if (!payload?.userId || (payload.v !== 1 && payload.v !== 2)) {
      res.status(400).json({ ok: false, error: 'Invalid payload' });
      return;
    }

    backups.set(payload.userId, payload);
    res.json({ ok: true, exportedAt: payload.exportedAt });
  });

  app.get('/api/sync/backup/:userId', (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const payload = backups.get(userId);
    if (!payload) {
      res.status(404).json({ ok: false, error: 'Backup not found' });
      return;
    }

    res.type('application/json').send(JSON.stringify(payload));
  });
}
