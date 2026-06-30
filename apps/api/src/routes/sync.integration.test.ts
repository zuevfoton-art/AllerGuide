import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createSyncPayload, decryptString, encryptString } from '@allerguide/core';
import { createApp } from '../app';
import {
  applyIntegrationDefaults,
  hasIntegrationDatabase,
  resetProfileData,
  uniqueLogin,
} from '../test/integration-harness';
import { closeDb } from '../db';

const RECOVERY_KEY = 'c'.repeat(64);

async function registerUser(app: Awaited<ReturnType<typeof createApp>>, prefix: string) {
  const login = uniqueLogin(prefix);
  const password = 'TestPass1!';
  const response = await request(app).post('/api/auth/register').send({
    loginType: 'email',
    login,
    password,
    confirmPassword: password,
  });
  expect(response.status).toBe(201);
  return {
    token: response.body.token as string,
    userId: response.body.user.id as number,
  };
}

describe.skipIf(!hasIntegrationDatabase)('sync integration (P1.6b)', () => {
  beforeAll(() => {
    applyIntegrationDefaults();
  });

  afterEach(async () => {
    await resetProfileData();
  });

  afterAll(() => {
    closeDb();
  });

  it('persists encrypted backup in Postgres and enforces IDOR on download', async () => {
    const app = await createApp({ withReplitAuth: false });
    const userA = await registerUser(app, 'sync-a');
    const userB = await registerUser(app, 'sync-b');

    const payload = createSyncPayload({
      userId: userA.userId,
      profiles: [
        {
          id: 1,
          userId: userA.userId,
          name: 'CI Sync',
          birthYear: 1990,
          type: 'self',
          allergies: '[]',
        },
      ],
      diaryEntries: [],
      emergencyContacts: [],
    });
    const envelope = await encryptString(JSON.stringify(payload), RECOVERY_KEY);

    const upload = await request(app)
      .post('/api/sync/backup')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        v: 2,
        userId: userA.userId,
        exportedAt: payload.exportedAt,
        encrypted: true,
        payload: envelope,
      });
    expect(upload.status).toBe(200);

    const ownDownload = await request(app)
      .get(`/api/sync/backup/${userA.userId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(ownDownload.status).toBe(200);
    expect(ownDownload.body.encrypted).toBe(true);

    const decrypted = await decryptString(ownDownload.body.payload, RECOVERY_KEY);
    expect(decrypted).not.toBeNull();
    expect(JSON.parse(decrypted!).profiles[0].name).toBe('CI Sync');

    const idor = await request(app)
      .get(`/api/sync/backup/${userA.userId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(idor.status).toBe(403);
  });
});
