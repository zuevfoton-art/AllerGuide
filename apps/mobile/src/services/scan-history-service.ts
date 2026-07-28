import { getDb } from '@/src/db/init';
import type { ScanHistoryEntry } from '@allerguide/core';
import type { ScanResult } from '@allerguide/ai';

/** 2-minute window for menu/OCR scan deduplication. */
const DEDUP_WINDOW_MS = 2 * 60 * 1000;

/**
 * Returns true when an identical (mode + normalised input) scan entry already
 * exists within the last 2 minutes for this profile.
 * Only deduplicates OCR-derived modes (menu, medicine, cosmetics).
 */
function isDuplicateScanEntry(
  profileId: number,
  mode: string,
  input: string,
): boolean {
  if (mode === 'product') return false;
  const cutoffMs = Date.now() - DEDUP_WINDOW_MS;
  const normalised = input.trim().toLowerCase();
  const recent = listScanHistory(profileId);
  return recent.some(
    (e) =>
      e.mode === mode &&
      e.input.trim().toLowerCase() === normalised &&
      new Date(e.createdAt).getTime() >= cutoffMs,
  );
}

export function saveScanHistory(
  profileId: number,
  input: string,
  result: ScanResult,
  productName?: string,
) {
  const db = getDb();
  const mode = result.mode;
  const trimmedInput = input.trim();

  if (isDuplicateScanEntry(profileId, mode, trimmedInput)) return;

  db.runSync(
    'INSERT INTO scan_history (profileId, mode, input, verdict, matches, level, productName, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      profileId,
      mode,
      trimmedInput,
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
