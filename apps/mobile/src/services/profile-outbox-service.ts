import type { ProfileInput } from '@allerguide/core';
import { persistDbWrites } from '@/src/db/init';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { getBackendAuthToken } from '@/src/services/auth-service';
import {
  backendCreateProfile,
  backendUpdateProfile,
  upsertLocalProfile,
} from '@/src/services/backend-api';
import { getDb } from '@/src/db/init';
import { useAppStore } from '@/src/store/app-store';
import { logCaughtError } from '@/src/services/error-reporting';
import { resolveApiErrorCode } from '@/src/services/api-errors';

const OUTBOX_SETTING_KEY = 'profile_outbox_v1';

export type ProfileOutboxOp = 'create' | 'update';

export type ProfileOutboxItem = {
  id: string;
  op: ProfileOutboxOp;
  localId?: number;
  input: ProfileInput;
  createdAt: string;
};

function loadOutbox(): ProfileOutboxItem[] {
  const raw = getSetting(OUTBOX_SETTING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProfileOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutbox(items: ProfileOutboxItem[]): void {
  setSetting(OUTBOX_SETTING_KEY, JSON.stringify(items));
}

export function listProfileOutbox(): ProfileOutboxItem[] {
  return loadOutbox();
}

export function enqueueProfileOutbox(
  item: Omit<ProfileOutboxItem, 'id' | 'createdAt'>,
): ProfileOutboxItem {
  const entry: ProfileOutboxItem = {
    ...item,
    id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  saveOutbox([...loadOutbox(), entry]);
  return entry;
}

export function isNetworkUnavailableStatus(status: number): boolean {
  return resolveApiErrorCode(status) === 'network_unavailable';
}

/**
 * Replay queued profile create/update mutations when the backend is reachable.
 * Create rows that got a new server id replace the local row (new profiles have no diary yet).
 */
export async function flushProfileOutbox(): Promise<{ synced: number; failed: number }> {
  const pending = loadOutbox();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const token = await getBackendAuthToken();
  if (!token) return { synced: 0, failed: pending.length };

  const remaining: ProfileOutboxItem[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      if (item.op === 'create') {
        const response = await backendCreateProfile(token, item.input);
        if (!response.ok) {
          if (isNetworkUnavailableStatus(response.status)) {
            remaining.push(item);
          } else {
            failed += 1;
            logCaughtError('flushProfileOutbox.create', new Error(response.error), {
              level: 'warn',
            });
          }
          continue;
        }
        const serverProfile = response.data.profile;
        upsertLocalProfile(serverProfile);
        if (item.localId != null && item.localId !== serverProfile.id) {
          getDb().runSync('DELETE FROM profiles WHERE id = ?', [item.localId]);
          const { activeProfileId, setActiveProfile } = useAppStore.getState();
          if (activeProfileId === item.localId) setActiveProfile(serverProfile);
        }
        synced += 1;
        continue;
      }

      if (item.localId == null) {
        failed += 1;
        continue;
      }
      const response = await backendUpdateProfile(token, item.localId, item.input);
      if (!response.ok) {
        if (isNetworkUnavailableStatus(response.status)) {
          remaining.push(item);
        } else {
          failed += 1;
          logCaughtError('flushProfileOutbox.update', new Error(response.error), {
            level: 'warn',
          });
        }
        continue;
      }
      upsertLocalProfile(response.data.profile);
      synced += 1;
    } catch (error) {
      remaining.push(item);
      failed += 1;
      logCaughtError('flushProfileOutbox', error, { level: 'warn' });
    }
  }

  saveOutbox(remaining);
  if (synced > 0) {
    await persistDbWrites();
  }
  return { synced, failed };
}
