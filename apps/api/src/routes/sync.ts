import type { Express, NextFunction, Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { verifyAuthToken } from '../lib/jwt';
import { db } from '../db';
import {
  diaryEntries,
  emergencyContacts,
  profileSos,
  profiles,
  scanHistory,
  syncBackups,
} from '../db/schema';
import { parseSyncPayload, type SyncPayload } from '@allerguide/core';

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
 * Write a parsed plaintext SyncPayload into the structured tables.
 * Uses a full-replace strategy: deletes the user's existing rows and
 * re-inserts everything from the payload.
 */
async function writeStructuredData(userId: number, payload: SyncPayload): Promise<void> {
  // Delete old data (children first to respect FK constraints)
  await db.delete(profileSos).where(eq(profileSos.userId, userId));
  await db.delete(emergencyContacts).where(eq(emergencyContacts.userId, userId));
  await db.delete(scanHistory).where(eq(scanHistory.userId, userId));
  await db.delete(diaryEntries).where(eq(diaryEntries.userId, userId));
  await db.delete(profiles).where(eq(profiles.userId, userId));

  if (payload.profiles.length > 0) {
    await db.insert(profiles).values(
      payload.profiles.map((p) => ({
        userId,
        name: p.name,
        birthYear: p.birthYear ?? 0,
        type: p.type,
        allergies: typeof p.allergies === 'string' ? p.allergies : JSON.stringify(p.allergies ?? []),
        allergyConfirmations:
          typeof p.allergyConfirmations === 'string'
            ? p.allergyConfirmations
            : JSON.stringify(p.allergyConfirmations ?? {}),
      })),
    );
  }

  if (payload.diaryEntries.length > 0) {
    await db.insert(diaryEntries).values(
      payload.diaryEntries.map((e) => ({
        userId,
        profileId: e.profileId,
        type: e.type,
        details: e.details ?? '',
        createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
      })),
    );
  }

  if (payload.emergencyContacts.length > 0) {
    await db.insert(emergencyContacts).values(
      payload.emergencyContacts.map((c) => ({
        userId,
        profileId: c.profileId,
        name: c.name,
        phone: c.phone,
        relation: c.relation,
      })),
    );
  }

  if (payload.scanHistory && payload.scanHistory.length > 0) {
    await db.insert(scanHistory).values(
      payload.scanHistory.map((s) => ({
        userId,
        profileId: s.profileId,
        mode: s.mode,
        input: s.input ?? '',
        verdict: s.verdict ?? '',
        matches: (() => {
          try {
            return (typeof s.matches === 'string' ? JSON.parse(s.matches) : s.matches) as string[];
          } catch {
            return [] as string[];
          }
        })(),
        level: s.level ?? '',
        productName: s.productName ?? null,
        source: s.source ?? '',
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      })),
    );
  }

  if (payload.profileSos && payload.profileSos.length > 0) {
    await db.insert(profileSos).values(
      payload.profileSos.map((s) => ({
        userId,
        profileId: s.profileId,
        notes: s.notes ?? '',
      })),
    );
  }
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
  }

  next();
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

  /**
   * Structured push: receives a plaintext SyncPayload and writes to all
   * structured tables (profiles, diary_entries, emergency_contacts,
   * scan_history, profile_sos). Requires JWT authentication.
   * Also persists a blob backup for restore compatibility.
   */
  app.post('/api/sync/push', async (req: Request, res: Response) => {
    const tokenUserId = req.syncUserId;
    if (!tokenUserId) {
      res.status(401).json({ ok: false, error: 'JWT authentication required' });
      return;
    }

    const raw = JSON.stringify(req.body);
    const payload = parseSyncPayload(raw);

    if (!payload) {
      res.status(400).json({ ok: false, error: 'Invalid sync payload' });
      return;
    }

    if (payload.userId && payload.userId !== tokenUserId) {
      res.status(403).json({ ok: false, error: 'User mismatch' });
      return;
    }

    try {
      await writeStructuredData(tokenUserId, payload);
      await persistBackup({
        userId: tokenUserId,
        version: payload.v,
        encrypted: false,
        exportedAt: payload.exportedAt,
        raw: JSON.stringify({ ...payload, userId: tokenUserId }),
      });
      res.json({ ok: true, exportedAt: payload.exportedAt });
    } catch (err) {
      console.error('Sync push error:', err);
      res.status(500).json({ ok: false, error: 'Sync failed' });
    }
  });
}
