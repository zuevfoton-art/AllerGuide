import type { Express, Request, Response } from 'express';

interface SyncPayload {
  v: 1;
  userId: number;
  exportedAt: string;
  profiles: unknown[];
  diaryEntries: unknown[];
  emergencyContacts: unknown[];
}

const backups = new Map<number, SyncPayload>();

export function registerSyncRoutes(app: Express) {
  app.post('/api/sync/backup', (req: Request, res: Response) => {
    const payload = req.body as SyncPayload;
    if (!payload?.userId || payload.v !== 1) {
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
