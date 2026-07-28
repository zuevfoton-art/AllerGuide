import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getDb } from '@/src/db/init';
import { logCaughtError } from '@/src/services/error-reporting';

export type DiaryAttachment = {
  id: number;
  entryId: number;
  kind: string;
  localPath: string;
  createdAt: string;
};

const MAX_PHOTOS = 5;

export function listDiaryAttachments(entryId: number): DiaryAttachment[] {
  const db = getDb();
  return db.getAllSync<DiaryAttachment>(
    'SELECT * FROM diary_attachments WHERE entryId = ? ORDER BY id ASC',
    [entryId],
  );
}

export function listDiaryAttachmentsForEntries(entryIds: number[]): DiaryAttachment[] {
  if (!entryIds.length) return [];
  const db = getDb();
  const placeholders = entryIds.map(() => '?').join(',');
  return db.getAllSync<DiaryAttachment>(
    `SELECT * FROM diary_attachments WHERE entryId IN (${placeholders}) ORDER BY id ASC`,
    entryIds,
  );
}

async function ensurePhotoDir(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  const dir = `${base}diary-photos/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

async function persistPhotoFile(sourceUri: string, entryId: number, index: number): Promise<string> {
  if (sourceUri.startsWith('data:')) {
    return sourceUri;
  }

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(sourceUri);
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      return dataUrl;
    } catch (error) {
      logCaughtError('persistPhotoFile.web', error, { level: 'warn' });
      return sourceUri;
    }
  }

  const dir = await ensurePhotoDir();
  if (!dir) return sourceUri;

  const ext = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const dest = `${dir}entry-${entryId}-${Date.now()}-${index}.${ext}`;
  try {
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch (error) {
    logCaughtError('persistPhotoFile.copy', error, { level: 'warn' });
    return sourceUri;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export async function replaceDiaryPhotos(entryId: number, sourceUris: string[]): Promise<void> {
  await deleteDiaryAttachmentsForEntry(entryId);
  const db = getDb();
  const limited = sourceUris.slice(0, MAX_PHOTOS);
  const now = new Date().toISOString();

  for (let i = 0; i < limited.length; i += 1) {
    const localPath = await persistPhotoFile(limited[i], entryId, i);
    db.runSync(
      'INSERT INTO diary_attachments (entryId, kind, localPath, createdAt) VALUES (?, ?, ?, ?)',
      [entryId, 'photo', localPath, now],
    );
  }
}

export async function deleteDiaryAttachmentsForEntry(entryId: number): Promise<void> {
  const existing = listDiaryAttachments(entryId);
  const db = getDb();
  db.runSync('DELETE FROM diary_attachments WHERE entryId = ?', [entryId]);

  if (Platform.OS === 'web') return;

  for (const item of existing) {
    if (item.localPath.startsWith('data:')) continue;
    try {
      const info = await FileSystem.getInfoAsync(item.localPath);
      if (info.exists) {
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
      }
    } catch (error) {
      logCaughtError('deleteDiaryAttachmentsForEntry', error, {
        level: 'warn',
        extra: { entryId: String(entryId), path: item.localPath },
      });
    }
  }
}

/** Read attachment as data URI for PDF embedding. */
export async function readDiaryAttachmentAsDataUri(localPath: string): Promise<string | null> {
  if (localPath.startsWith('data:')) return localPath;

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(localPath);
      const blob = await response.blob();
      return blobToDataUrl(blob);
    } catch (error) {
      logCaughtError('readDiaryAttachmentAsDataUri.web', error, { level: 'warn' });
      return null;
    }
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(localPath, {
      encoding: 'base64' as never,
    });
    const mime = localPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch (error) {
    logCaughtError('readDiaryAttachmentAsDataUri', error, { level: 'warn' });
    return null;
  }
}
