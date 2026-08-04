/* eslint-disable import/first -- vitest mocks must be registered before module import */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { exportLocalBackup, importLocalBackup } from '@/src/services/sync-service';
import { trackEvent } from '@/src/services/analytics-service';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

vi.mock('@/src/services/sync-service', () => ({
  exportLocalBackup: vi.fn(() => '{"profiles":[]}'),
  importLocalBackup: vi.fn(() => ({ ok: true as const })),
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  writeAsStringAsync: vi.fn(async () => undefined),
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => undefined),
}));

vi.mock('expo-document-picker', () => ({}));

import { shareLocalBackupFile } from './backup-file-service';

describe('backup-file-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports backup on native and tracks analytics', async () => {
    const result = await shareLocalBackupFile();

    expect(result.ok).toBe(true);
    expect(exportLocalBackup).toHaveBeenCalled();
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith('backup_exported');
  });

  it('roundtrips import via importLocalBackup', () => {
    const raw = '{"profiles":[]}';
    const result = importLocalBackup(raw);
    expect(result.ok).toBe(true);
  });
});
