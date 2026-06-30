import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createSyncPayload, decryptString, encryptString } from '@allerguide/core';
import { createApp } from '../app';
import { signAuthToken } from '../lib/jwt';

const ORIGINAL_ENV = { ...process.env };
const RECOVERY_KEY = 'a'.repeat(64);

async function bearer(sub: number): Promise<string> {
  const token = await signAuthToken({ sub, login: `user${sub}`, loginType: 'email' });
  return `Bearer ${token}`;
}

describe('encrypted sync round-trip (P1.4b)', () => {
  beforeEach(() => {
    process.env.SYNC_ENABLED = 'true';
    process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
    delete process.env.SYNC_API_KEY;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('uploads ciphertext and restores plaintext with the recovery key', async () => {
    const app = await createApp({ withReplitAuth: false });
    const auth = await bearer(11);
    const payload = createSyncPayload({
      userId: 11,
      profiles: [
        { id: 1, userId: 11, name: 'Anna', birthYear: 1990, type: 'self', allergies: '[]' },
      ],
      diaryEntries: [],
      emergencyContacts: [],
      scanHistory: [],
      profileSos: [],
      appSettings: { locale: 'ru' },
    });
    const envelope = await encryptString(JSON.stringify(payload), RECOVERY_KEY);

    const upload = await request(app)
      .post('/api/sync/backup')
      .set('Authorization', auth)
      .send({
        v: 2,
        userId: 11,
        exportedAt: payload.exportedAt,
        encrypted: true,
        payload: envelope,
      });
    expect(upload.status).toBe(200);

    const download = await request(app).get('/api/sync/backup/11').set('Authorization', auth);
    expect(download.status).toBe(200);
    expect(download.body.encrypted).toBe(true);
    expect(download.body.payload).toBe(envelope);

    const decrypted = await decryptString(download.body.payload, RECOVERY_KEY);
    expect(decrypted).not.toBeNull();
    const restored = JSON.parse(decrypted!) as typeof payload;
    expect(restored.profiles).toHaveLength(1);
    expect(restored.profiles[0].name).toBe('Anna');
    expect(restored.appSettings?.locale).toBe('ru');
  });
});
