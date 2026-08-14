import { beforeEach, describe, expect, it, vi } from 'vitest';

const diaryRows: {
  id: number;
  profileId: number;
  type: string;
  details: string;
  createdAt: string;
}[] = [];
const profiles = [
  { id: 1, userId: 7 },
  { id: 2, userId: 7 },
  { id: 3, userId: 7 },
  { id: 5, userId: 7 },
  { id: 9, userId: 8 },
];

let nextId = 1;

const runSync = vi.fn((sql: string, params: unknown[] = []) => {
  if (sql.startsWith('INSERT INTO diary_entries')) {
    const [profileId, type, details, createdAt] = params as [number, string, string, string];
    diaryRows.push({ id: nextId++, profileId, type, details, createdAt });
    return;
  }
  if (sql.startsWith('UPDATE diary_entries')) {
    const [type, details, id, profileId] = params as [string, string, number, number];
    const row = diaryRows.find(
      (entry) => entry.id === id && entry.profileId === profileId,
    );
    if (row) {
      row.type = type;
      row.details = details;
    }
    return;
  }
  if (sql.startsWith('DELETE FROM diary_entries')) {
    const [id, profileId] = params as [number, number];
    const index = diaryRows.findIndex(
      (entry) => entry.id === id && entry.profileId === profileId,
    );
    if (index >= 0) diaryRows.splice(index, 1);
  }
});

const getAllSync = vi.fn((sql: string, params: unknown[] = []) => {
  if (sql.includes('FROM profiles WHERE userId = ?')) {
    return profiles.filter((profile) => profile.userId === params[0]);
  }
  if (sql.includes('WHERE profileId = ?')) {
    const [profileId] = params as [number];
    return diaryRows
      .filter((entry) => entry.profileId === profileId)
      .sort((a, b) => b.id - a.id);
  }
  return [...diaryRows].sort((a, b) => b.id - a.id);
});

const getFirstSync = vi.fn((sql: string, params: unknown[] = []) => {
  if (sql.includes('WHERE profileId = ?') && sql.includes('AND type = ?')) {
    return (
      diaryRows
        .filter(
          (entry) =>
            entry.profileId === params[0] &&
            entry.type === params[1] &&
            entry.createdAt === params[2],
        )
        .sort((left, right) => right.id - left.id)[0] ?? null
    );
  }
  if (sql.includes('FROM diary_entries WHERE id = ?')) {
    return diaryRows.find((entry) => entry.id === params[0]) ?? null;
  }
  return null;
});

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 7,
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({ runSync, getAllSync, getFirstSync }),
}));

vi.mock('@/src/services/diary-attachment-service', () => ({
  deleteDiaryAttachmentsForEntry: vi.fn(),
  listDiaryAttachments: vi.fn(() => []),
  replaceDiaryPhotos: vi.fn(),
}));

describe('diary-service', () => {
  beforeEach(() => {
    diaryRows.length = 0;
    nextId = 1;
    runSync.mockClear();
    getAllSync.mockClear();
    getFirstSync.mockClear();
  });

  it('adds a diary entry for the profile', async () => {
    const { addDiaryEntry, getDiaryEntries } = await import('./diary-service');
    const createdAt = '2026-06-20T10:00:00.000Z';
    const details = JSON.stringify({ v: 1, answers: { symptoms: 'зуд' } });

    await addDiaryEntry({ profileId: 3, type: 'Симптомы', details, createdAt });

    const entries = await getDiaryEntries(3);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ profileId: 3, type: 'Симптомы', details, createdAt });
  });

  it('adds multiple entries in batch', async () => {
    const { addDiaryEntries, getDiaryEntries } = await import('./diary-service');
    await addDiaryEntries(
      5,
      [
        { type: 'Симптомы', details: '{"v":1,"answers":{}}' },
        { type: 'Триггер', details: '{"v":1,"answers":{}}' },
      ],
      '2026-06-20T12:00:00.000Z',
    );

    const entries = await getDiaryEntries(5);
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.type).sort()).toEqual(['Симптомы', 'Триггер']);
  });

  it('updates and deletes an entry', async () => {
    const { addDiaryEntry, updateDiaryEntry, deleteDiaryEntry, getDiaryEntries } = await import(
      './diary-service'
    );

    await addDiaryEntry({
      profileId: 1,
      type: 'Симптомы',
      details: '{"v":1,"answers":{"symptoms":"кашель"}}',
      createdAt: '2026-06-20T08:00:00.000Z',
    });

    const [entry] = await getDiaryEntries(1);
    await updateDiaryEntry(entry.id, {
      type: 'Симптомы',
      details: '{"v":1,"answers":{"symptoms":"одышка"}}',
    });

    let entries = await getDiaryEntries(1);
    expect(entries[0].details).toContain('одышка');

    await deleteDiaryEntry(entry.id);
    entries = await getDiaryEntries(1);
    expect(entries).toHaveLength(0);
  });

  it('lists all diary entries across profiles', async () => {
    const { addDiaryEntry, listAllDiaryEntries } = await import('./diary-service');

    await addDiaryEntry({
      profileId: 1,
      type: 'Симптомы',
      details: '{}',
      createdAt: '2026-06-20T08:00:00.000Z',
    });
    await addDiaryEntry({
      profileId: 2,
      type: 'Питание',
      details: '{}',
      createdAt: '2026-06-20T09:00:00.000Z',
    });

    expect(listAllDiaryEntries()).toHaveLength(2);
  });

  it('rejects access to another users profile and diary entry', async () => {
    diaryRows.push({
      id: 40,
      profileId: 9,
      type: 'Заметка',
      details: '{"v":1,"answers":{"noteBody":"private"}}',
      createdAt: '2026-06-20T09:00:00.000Z',
    });
    const {
      addDiaryEntry,
      deleteDiaryEntry,
      getDiaryEntries,
      listAllDiaryEntries,
      updateDiaryEntry,
    } = await import('./diary-service');

    await expect(
      addDiaryEntry({
        profileId: 9,
        type: 'Заметка',
        details: '{}',
        createdAt: '2026-06-20T10:00:00.000Z',
      }),
    ).resolves.toEqual({ ok: false, code: 'profile_not_found' });
    await expect(
      updateDiaryEntry(40, { type: 'Заметка', details: 'changed' }),
    ).resolves.toEqual({ ok: false, code: 'entry_not_found' });
    await expect(deleteDiaryEntry(40)).resolves.toEqual({
      ok: false,
      code: 'entry_not_found',
    });
    await expect(getDiaryEntries(9)).resolves.toEqual([]);
    expect(listAllDiaryEntries()).not.toContainEqual(
      expect.objectContaining({ id: 40 }),
    );
    expect(diaryRows.find((entry) => entry.id === 40)?.details).toContain('private');
  });
});
