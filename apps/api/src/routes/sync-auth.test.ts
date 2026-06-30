import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/jwt';

const ORIGINAL_ENV = { ...process.env };

async function bearer(sub: number): Promise<string> {
  const token = await signAuthToken({ sub, login: `user${sub}`, loginType: 'email' });
  return `Bearer ${token}`;
}

describe('JWT-authenticated sync', () => {
  beforeEach(() => {
    process.env.SYNC_ENABLED = 'true';
    process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
    delete process.env.SYNC_API_KEY;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('lets an authenticated user store and read their own backup', async () => {
    const app = await createApp({ withReplitAuth: false });
    const auth = await bearer(7);

    const upload = await request(app)
      .post('/api/sync/backup')
      .set('Authorization', auth)
      .send({
        v: 2,
        userId: 7,
        exportedAt: new Date().toISOString(),
        profiles: [{ id: 1, userId: 7, name: 'Anna', birthYear: 1990, type: 'self', allergies: '[]' }],
        diaryEntries: [],
        emergencyContacts: [],
      });
    expect(upload.status).toBe(200);

    const download = await request(app).get('/api/sync/backup/7').set('Authorization', auth);
    expect(download.status).toBe(200);
    expect(download.body.profiles).toHaveLength(1);
  });

  it('forbids reading another user backup', async () => {
    const app = await createApp({ withReplitAuth: false });
    const download = await request(app)
      .get('/api/sync/backup/999')
      .set('Authorization', await bearer(7));
    expect(download.status).toBe(403);
  });

  it('rejects a userId mismatch on upload', async () => {
    const app = await createApp({ withReplitAuth: false });
    const upload = await request(app)
      .post('/api/sync/backup')
      .set('Authorization', await bearer(7))
      .send({ v: 2, userId: 9, exportedAt: new Date().toISOString(), profiles: [] });
    expect(upload.status).toBe(403);
  });

  it('stores an encrypted backup opaquely', async () => {
    const app = await createApp({ withReplitAuth: false });
    const auth = await bearer(7);
    const envelope = JSON.stringify({ alg: 'AES-GCM', ct: 'deadbeef' });

    const upload = await request(app)
      .post('/api/sync/backup')
      .set('Authorization', auth)
      .send({ v: 2, userId: 7, encrypted: true, exportedAt: new Date().toISOString(), payload: envelope });
    expect(upload.status).toBe(200);

    const download = await request(app).get('/api/sync/backup/7').set('Authorization', auth);
    expect(download.status).toBe(200);
    expect(download.body.encrypted).toBe(true);
    expect(download.body.payload).toBe(envelope);
    expect(JSON.stringify(download.body)).not.toContain('Anna');
  });

  it('rejects sync without auth when JWT secret is the only mechanism', async () => {
    const app = await createApp({ withReplitAuth: false });
    const download = await request(app).get('/api/sync/backup/4242');
    expect(download.status).toBe(401);
  });
});
