import type { Express, NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { verifyAuthToken } from '../lib/jwt';
import { db } from '../db';
import { syncBackups } from '../db/schema';

interface SyncBody {
  v?: 1 | 2;
  userId?: number;
  exportedAt?: string;
  encrypted?: boolean;
  // plaintext payloads carry these; encrypted payloads carry `payload` only
  payload?: string;
  profiles?: unknown[];
  diaryEntries?: unknown[];
  emergencyContacts?: unknown[];
  scanHistory?: unknown[];
  profileSos?: unknown[];
  appSettings?: Record<string, string>;
}

function isSyncEnabled(): boolean {
  return process.env.SYNC_ENABLED === 'true';
}

function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Fallback store for environments without a database (e.g. unit tests).
const memoryBackups = new Map<number, string>();

async function persistBackup(record: {
  userId: number;
  version: number;
  encrypted: boolean;
  exportedAt?: string;
  raw: string;
}): Promise<void> {
  if (!databaseConfigured()) {
    memoryBackups.set(record.userId, record.raw);
    return;
  }

  await db
    .insert(syncBackups)
    .values({
      userId: record.userId,
      version: record.version,
      encrypted: record.encrypted,
      exportedAt: record.exportedAt,
      payload: record.raw,
    })
    .onConflictDoUpdate({
      target: syncBackups.userId,
      set: {
        version: record.version,
        encrypted: record.encrypted,
        exportedAt: record.exportedAt,
        payload: record.raw,
        updatedAt: new Date(),
      },
    });
}

async function loadBackup(userId: number): Promise<string | null> {
  if (!databaseConfigured()) {
    return memoryBackups.get(userId) ?? null;
  }

  const [row] = await db.select().from(syncBackups).where(eq(syncBackups.userId, userId));
  return row?.payload ?? null;
}

/**
 * Sync access requires either a valid mobile JWT (preferred — ties data to the
 * authenticated user) or the shared SYNC_API_KEY (legacy/server-to-server).
 */
async function requireSyncAccess(req: Request, res: Response, next: NextFunction) {
  if (!isSyncEnabled()) {
    res.status(503).json({ ok: false, error: 'Sync is disabled on this server' });
    return;
  }

  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const payload = await verifyAuthToken(header.slice('Bearer '.length).trim());
    if (!payload) {
      res.status(401).json({ ok: false, error: 'Invalid or expired token' });
      return;
    }
    req.syncUserId = payload.sub;
    next();
    return;
  }

  const configuredKey = process.env.SYNC_API_KEY;
  if (configuredKey) {
    if (req.header('x-sync-api-key') !== configuredKey) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    next();
    return;
  }

  if (process.env.JWT_SECRET) {
    res.status(401).json({ ok: false, error: 'Authorization required' });
    return;
  }

  res.status(401).json({ ok: false, error: 'Authorization required' });
}

export function registerSyncRoutes(app: Express) {
  app.use('/api/sync', requireSyncAccess);

  app.post('/api/sync/backup', async (req: Request, res: Response) => {
    const body = req.body as SyncBody;
    const tokenUserId = req.syncUserId;
    const userId = tokenUserId ?? Number(body?.userId);

    if (!userId || (body?.v !== 1 && body?.v !== 2)) {
      res.status(400).json({ ok: false, error: 'Invalid payload' });
      return;
    }

    // When authenticated via JWT, callers may only write their own backup.
    if (tokenUserId && body?.userId && Number(body.userId) !== tokenUserId) {
      res.status(403).json({ ok: false, error: 'User mismatch' });
      return;
    }

    try {
      await persistBackup({
        userId,
        version: body.v,
        encrypted: body.encrypted === true,
        exportedAt: body.exportedAt,
        raw: JSON.stringify({ ...body, userId }),
      });
      res.json({ ok: true, exportedAt: body.exportedAt });
    } catch {
      res.status(500).json({ ok: false, error: 'Failed to store backup' });
    }
  });

  app.get('/api/sync/backup/:userId', async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);

    if (req.syncUserId && req.syncUserId !== userId) {
      res.status(403).json({ ok: false, error: 'Forbidden' });
      return;
    }

    try {
      const raw = await loadBackup(userId);
      if (!raw) {
        res.status(404).json({ ok: false, error: 'Backup not found' });
        return;
      }
      res.type('application/json').send(raw);
    } catch {
      res.status(500).json({ ok: false, error: 'Failed to load backup' });
    }
  });
}
