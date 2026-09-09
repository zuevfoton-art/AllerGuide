import { Platform } from 'react-native';
import type { ScanHistoryEntry } from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { webCollections } from '@/src/db/web-collections';
import { nextNumericId } from '@/src/db/repositories/next-id';

export type ScanHistoryWrite = {
  profileId: number;
  mode: string;
  input: string;
  verdict: string;
  matches: string;
  level: string;
  productName: string | null;
  source: string;
  createdAt: string;
};

export interface ScanHistoryRepository {
  listByProfileId(profileId: number): ScanHistoryEntry[];
  insert(row: ScanHistoryWrite): void;
}

export const webScanHistoryRepository: ScanHistoryRepository = {
  listByProfileId(profileId) {
    return webCollections
      .getScanHistory()
      .filter((entry) => entry.profileId === profileId)
      .sort((left, right) => right.id - left.id);
  },

  insert(row) {
    const entries = webCollections.getScanHistory();
    entries.push({ id: nextNumericId(entries), ...row });
    webCollections.saveScanHistory(entries);
  },
};

export const sqliteScanHistoryRepository: ScanHistoryRepository = {
  listByProfileId(profileId) {
    return getDb().getAllSync<ScanHistoryEntry>(
      'SELECT * FROM scan_history WHERE profileId = ? ORDER BY id DESC',
      [profileId],
    );
  },

  insert(row) {
    getDb().runSync(
      'INSERT INTO scan_history (profileId, mode, input, verdict, matches, level, productName, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        row.profileId,
        row.mode,
        row.input,
        row.verdict,
        row.matches,
        row.level,
        row.productName,
        row.source,
        row.createdAt,
      ],
    );
  },
};

export function getScanHistoryRepository(): ScanHistoryRepository {
  return Platform.OS === 'web' ? webScanHistoryRepository : sqliteScanHistoryRepository;
}
