import { getDb } from '@/src/db/init';
import type { ScanHistoryEntry } from '@allerguide/core';
import type { ScanResult } from '@allerguide/ai';

export function saveScanHistory(
  profileId: number,
  input: string,
  result: ScanResult,
  productName?: string,
) {
  const db = getDb();
  db.runSync(
    'INSERT INTO scan_history (profileId, mode, input, verdict, matches, level, productName, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      profileId,
      result.mode,
      input,
      result.verdict,
      JSON.stringify([...result.matches, ...result.crossMatches]),
      result.level,
      productName ?? result.productName ?? null,
      result.source ?? 'manual',
      new Date().toISOString(),
    ],
  );
}

export function listScanHistory(profileId: number): ScanHistoryEntry[] {
  const db = getDb();
  return db.getAllSync<ScanHistoryEntry>(
    'SELECT * FROM scan_history WHERE profileId = ? ORDER BY id DESC',
    [profileId],
  );
}
