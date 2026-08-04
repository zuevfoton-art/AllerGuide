import { beforeEach, describe, expect, it, vi } from 'vitest';

const settingsStore = new Map<string, string>();
const attachments: {
  id: number;
  entryId: number;
  kind: string;
  localPath: string;
  createdAt: string;
}[] = [];
let nextId = 1;

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: null,
  getInfoAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  copyAsync: vi.fn(),
  deleteAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    runSync: (sql: string, params?: unknown[]) => {
      const s = sql.toLowerCase();
      if (s.startsWith('insert into diary_attachments')) {
        attachments.push({
          id: nextId++,
          entryId: params![0] as number,
          kind: params![1] as string,
          localPath: params![2] as string,
          createdAt: params![3] as string,
        });
      }
      if (s.startsWith('delete from diary_attachments')) {
        const entryId = params![0] as number;
        for (let i = attachments.length - 1; i >= 0; i -= 1) {
          if (attachments[i].entryId === entryId) attachments.splice(i, 1);
        }
      }
    },
    getAllSync: <T>(sql: string, params?: unknown[]) => {
      const s = sql.toLowerCase();
      if (s.includes('from diary_attachments') && s.includes('where entryid =')) {
        return attachments.filter((item) => item.entryId === params![0]) as T[];
      }
      if (s.includes('from diary_attachments') && s.includes('where entryid in')) {
        const ids = new Set(params as number[]);
        return attachments.filter((item) => ids.has(item.entryId)) as T[];
      }
      return [] as T[];
    },
    getFirstSync: () => null,
    execSync: vi.fn(),
  }),
}));

import {
  listDiaryAttachments,
  replaceDiaryPhotos,
  deleteDiaryAttachmentsForEntry,
} from './diary-attachment-service';

describe('diary-attachment-service', () => {
  beforeEach(() => {
    attachments.length = 0;
    nextId = 1;
    settingsStore.clear();
  });

  it('stores and lists photo attachments for an entry', async () => {
    await replaceDiaryPhotos(10, ['data:image/jpeg;base64,abc', 'data:image/jpeg;base64,def']);
    expect(listDiaryAttachments(10)).toHaveLength(2);
    expect(listDiaryAttachments(10)[0].localPath).toContain('data:image');
  });

  it('replaces previous attachments on update', async () => {
    await replaceDiaryPhotos(10, ['data:image/jpeg;base64,one']);
    await replaceDiaryPhotos(10, ['data:image/jpeg;base64,two']);
    const rows = listDiaryAttachments(10);
    expect(rows).toHaveLength(1);
    expect(rows[0].localPath).toContain('two');
  });

  it('deletes attachments for an entry', async () => {
    await replaceDiaryPhotos(11, ['data:image/jpeg;base64,x']);
    await deleteDiaryAttachmentsForEntry(11);
    expect(listDiaryAttachments(11)).toHaveLength(0);
  });
});
