import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('sync routes', () => {
  beforeEach(() => {
    process.env.SYNC_ENABLED = 'true';
    process.env.SYNC_API_KEY = 'test-key';
  });

  it('rejects sync when disabled', async () => {
    process.env.SYNC_ENABLED = 'false';
    const app = await createApp({ withAuth: false });
    const response = await request(app).post('/api/sync/backup').send({});
    expect(response.status).toBe(503);
  });

  it('requires api key when configured', async () => {
    const app = await createApp({ withAuth: false });
    const response = await request(app).post('/api/sync/backup').send({
      v: 2,
      userId: 1,
      exportedAt: new Date().toISOString(),
      profiles: [],
      diaryEntries: [],
      emergencyContacts: [],
    });
    expect(response.status).toBe(401);
  });

  it('stores and returns backup payload', async () => {
    const app = await createApp({ withAuth: false });
    const payload = {
      v: 2,
      userId: 42,
      exportedAt: new Date().toISOString(),
      profiles: [{ id: 1, userId: 42, name: 'Anna', birthYear: 1990, type: 'self', allergies: '[]' }],
      diaryEntries: [],
      emergencyContacts: [],
      scanHistory: [],
      profileSos: [],
      appSettings: {},
    };

    const upload = await request(app)
      .post('/api/sync/backup')
      .set('x-sync-api-key', 'test-key')
      .send(payload);

    expect(upload.status).toBe(200);
    expect(upload.body.ok).toBe(true);

    const download = await request(app)
      .get('/api/sync/backup/42')
      .set('x-sync-api-key', 'test-key');

    expect(download.status).toBe(200);
    expect(download.body.userId).toBe(42);
    expect(download.body.profiles).toHaveLength(1);
  });
});
