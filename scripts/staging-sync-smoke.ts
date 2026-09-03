/**
 * Staging API smoke: JWT auth + encrypted backup upload/download (P1.4b).
 * Run: pnpm --filter api exec tsx ../../scripts/staging-sync-smoke.ts
 */
import {
  createSyncPayload,
  decryptString,
  encryptString,
  isEncryptionAvailable,
} from '@allerguide/core';

const BASE = (process.env.STAGING_API_URL ?? 'https://api.staging.aclearo.com').replace(/\/$/, '');
const RAND = process.env.RAND ?? String(Date.now());
const EMAIL = `staging-sync-${RAND}@example.com`;
const PASSWORD = 'SmokeTest1!';
const RECOVERY_KEY = 'b'.repeat(64);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${response.status}: ${text}`);
  }
  return body as T;
}

async function main() {
  if (!isEncryptionAvailable()) {
    throw new Error('Backup encryption is not available in this runtime');
  }

  console.log(`Staging sync smoke: ${BASE}`);
  console.log(`Test user: ${EMAIL}`);

  const health = await api<{ ok: boolean; features?: { sync: boolean } }>('/api/health');
  console.log('Health:', health);
  if (!health.ok) throw new Error('Health check failed');
  if (!health.features?.sync) throw new Error('SYNC_ENABLED is not true on staging API');

  const register = await api<{ token: string; user: { id: number } }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginType: 'email',
      login: EMAIL,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    }),
  });

  const token = register.token;
  const userId = register.user.id;
  if (!token || !userId) throw new Error('Register failed');

  const payload = createSyncPayload({
    userId,
    profiles: [
      {
        id: 1,
        userId,
        name: 'Staging Sync',
        birthYear: 1990,
        type: 'self',
        allergies: '[]',
      },
    ],
    diaryEntries: [],
    emergencyContacts: [],
    scanHistory: [],
    profileSos: [],
    appSettings: { locale: 'ru' },
  });

  const envelope = await encryptString(JSON.stringify(payload), RECOVERY_KEY);
  await api('/api/sync/backup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      v: 2,
      userId,
      exportedAt: payload.exportedAt,
      encrypted: true,
      payload: envelope,
    }),
  });

  const stored = await api<{ encrypted: boolean; payload: string }>(`/api/sync/backup/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!stored.encrypted || stored.payload !== envelope) {
    throw new Error('Downloaded backup does not match uploaded ciphertext');
  }

  const decrypted = await decryptString(stored.payload, RECOVERY_KEY);
  const restored = JSON.parse(decrypted) as ReturnType<typeof createSyncPayload>;
  if (restored.profiles[0]?.name !== 'Staging Sync') {
    throw new Error('Decrypted payload mismatch');
  }

  console.log(`Sync smoke passed (user id=${userId}, encrypted v2 round-trip).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
