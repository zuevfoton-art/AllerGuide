import { isEncryptedEnvelope } from '@allerguide/core';

export const SYNC_PLAINTEXT_COLLECTION_KEYS = [
  'profiles',
  'diaryEntries',
  'emergencyContacts',
  'scanHistory',
  'profileSos',
  'appSettings',
] as const;

export interface SyncBody {
  v?: 1 | 2;
  userId?: number;
  exportedAt?: string;
  encrypted?: boolean;
  payload?: string;
  profiles?: unknown[];
  diaryEntries?: unknown[];
  emergencyContacts?: unknown[];
  scanHistory?: unknown[];
  profileSos?: unknown[];
  appSettings?: Record<string, string>;
}

export type EncryptedSyncPayloadResult =
  | { ok: true; encrypted: boolean; raw: string }
  | { ok: false; error: string };

export const ENCRYPTED_BACKUP_REQUIRED = 'Encrypted backup required';

export function requireEncryptedBackup(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SYNC_REQUIRE_ENCRYPTED === 'true';
}

function hasPlaintextCollections(body: SyncBody): boolean {
  return SYNC_PLAINTEXT_COLLECTION_KEYS.some((key) => body[key] !== undefined);
}

/**
 * Encrypted uploads persist only the AES-GCM envelope. A client `encrypted: true`
 * flag is not enough — ciphertext must pass `isEncryptedEnvelope`, and plaintext
 * collection fields must be absent.
 */
export function resolveEncryptedSyncPayload(
  body: SyncBody,
  userId: number,
  env: NodeJS.ProcessEnv = process.env,
): EncryptedSyncPayloadResult {
  const wantsEncrypted = requireEncryptedBackup(env) || body.encrypted === true;

  if (!wantsEncrypted) {
    return { ok: true, encrypted: false, raw: JSON.stringify(body) };
  }

  if (typeof body.payload !== 'string' || !isEncryptedEnvelope(body.payload)) {
    return { ok: false, error: ENCRYPTED_BACKUP_REQUIRED };
  }

  if (hasPlaintextCollections(body)) {
    return { ok: false, error: ENCRYPTED_BACKUP_REQUIRED };
  }

  return {
    ok: true,
    encrypted: true,
    raw: JSON.stringify({
      v: body.v,
      userId,
      encrypted: true,
      exportedAt: body.exportedAt,
      payload: body.payload,
    }),
  };
}
