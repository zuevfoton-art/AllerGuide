import { describe, expect, it } from 'vitest';
import { ENCRYPTED_BACKUP_REQUIRED, resolveEncryptedSyncPayload } from './sync-payload';

const VALID_ENVELOPE = JSON.stringify({
  alg: 'AES-GCM',
  kdf: 'PBKDF2',
  iter: 100_000,
  salt: 'c2FsdA',
  iv: 'aXY',
  ct: 'Y3Q',
});

describe('resolveEncryptedSyncPayload', () => {
  it('stores plaintext when encryption is not required', () => {
    const body = {
      v: 2 as const,
      userId: 7,
      exportedAt: '2026-01-01T00:00:00.000Z',
      profiles: [{ id: 1, name: 'Anna' }],
    };

    const result = resolveEncryptedSyncPayload(body, 7, {});
    expect(result).toEqual({ ok: true, encrypted: false, raw: JSON.stringify(body) });
  });

  it('rejects a client encrypted flag without a real envelope', () => {
    const result = resolveEncryptedSyncPayload(
      {
        v: 2,
        userId: 7,
        encrypted: true,
        payload: JSON.stringify({ alg: 'AES-GCM', ct: 'deadbeef' }),
        profiles: [{ name: 'Anna' }],
      },
      7,
      {},
    );

    expect(result).toEqual({ ok: false, error: ENCRYPTED_BACKUP_REQUIRED });
  });

  it('rejects encrypted uploads that still carry plaintext collections', () => {
    const result = resolveEncryptedSyncPayload(
      {
        v: 2,
        userId: 7,
        encrypted: true,
        payload: VALID_ENVELOPE,
        profiles: [{ name: 'Anna' }],
      },
      7,
      {},
    );

    expect(result).toEqual({ ok: false, error: ENCRYPTED_BACKUP_REQUIRED });
  });

  it('persists only the opaque envelope when encryption is required', () => {
    const result = resolveEncryptedSyncPayload(
      {
        v: 2,
        userId: 7,
        encrypted: true,
        exportedAt: '2026-01-01T00:00:00.000Z',
        payload: VALID_ENVELOPE,
      },
      7,
      { SYNC_REQUIRE_ENCRYPTED: 'true' },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.encrypted).toBe(true);
    expect(result.raw).toBe(
      JSON.stringify({
        v: 2,
        userId: 7,
        encrypted: true,
        exportedAt: '2026-01-01T00:00:00.000Z',
        payload: VALID_ENVELOPE,
      }),
    );
    expect(result.raw).not.toContain('Anna');
    expect(result.raw).not.toContain('profiles');
  });

  it('requires an envelope when SYNC_REQUIRE_ENCRYPTED is on', () => {
    const result = resolveEncryptedSyncPayload(
      { v: 2, userId: 7, exportedAt: '2026-01-01T00:00:00.000Z', profiles: [] },
      7,
      { SYNC_REQUIRE_ENCRYPTED: 'true' },
    );
    expect(result).toEqual({ ok: false, error: ENCRYPTED_BACKUP_REQUIRED });
  });
});
