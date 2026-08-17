import {
  parseScanHistoryMatches,
  serializeScanHistoryMatches,
  type ScanHistoryEntry,
} from '@allerguide/core';
import type { ScanResult } from '@allerguide/ai';
import { getDb, persistDbWrites } from '@/src/db/init';
import { isOwnedProfile } from '@/src/services/owned-profiles';

/** 2-minute window for menu/OCR scan deduplication. */
const DEDUP_WINDOW_MS = 2 * 60 * 1000;

const SCAN_SOURCES = new Set([
  'manual',
  'barcode',
  'openfoodfacts',
  'barcodes_db',
  'catalog_api',
  'ocr',
  'llm',
  'dish_vision',
  'openbeautyfacts',
  'openproductsfacts',
]);

export type ScanHistoryMutationResult =
  | { ok: true }
  | { ok: false; code: 'profile_not_found' | 'invalid_input' };

export type ScanHistoryDisplayResult = {
  verdict: string;
  reason: string;
  matches: string[];
  crossMatches: string[];
  traceMatches: string[];
  mode: ScanResult['mode'];
  level: ScanResult['level'];
  productName?: string;
  source: ScanResult['source'];
  productIngredients?: string;
};

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
    (entry) =>
      entry.mode === mode &&
      entry.input.trim().toLowerCase() === normalised &&
      new Date(entry.createdAt).getTime() >= cutoffMs,
  );
}

function asScanMode(mode: string): ScanResult['mode'] {
  if (mode === 'menu' || mode === 'medicine' || mode === 'cosmetics') return mode;
  return 'product';
}

function asRiskLevel(level: string): ScanResult['level'] {
  if (level === 'high' || level === 'medium' || level === 'low') return level;
  return 'low';
}

function asScanSource(source: string): ScanResult['source'] {
  if (SCAN_SOURCES.has(source)) return source as ScanResult['source'];
  return 'manual';
}

export function historyEntryToScanResult(item: ScanHistoryEntry): ScanHistoryDisplayResult {
  const payload = parseScanHistoryMatches(item.matches);
  const source = asScanSource(item.source);
  const composition = payload.composition?.trim();

  return {
    verdict: item.verdict,
    reason: '',
    matches: payload.direct,
    crossMatches: payload.cross,
    traceMatches: payload.trace,
    mode: asScanMode(item.mode),
    level: asRiskLevel(item.level),
    productName: item.productName ?? undefined,
    source,
    productIngredients: composition,
  };
}

export async function saveScanHistory(
  profileId: number,
  input: string,
  result: ScanResult,
  productName?: string,
  extras?: { composition?: string },
): Promise<ScanHistoryMutationResult> {
  if (!isOwnedProfile(profileId)) {
    return { ok: false, code: 'profile_not_found' };
  }

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return { ok: false, code: 'invalid_input' };
  }

  const mode = result.mode;
  if (isDuplicateScanEntry(profileId, mode, trimmedInput)) {
    return { ok: true };
  }

  getDb().runSync(
    'INSERT INTO scan_history (profileId, mode, input, verdict, matches, level, productName, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      profileId,
      mode,
      trimmedInput,
      result.verdict,
      serializeScanHistoryMatches({
        matches: result.matches,
        crossMatches: result.crossMatches,
        traceMatches: result.traceMatches,
        composition: extras?.composition,
      }),
      result.level,
      productName ?? result.productName ?? null,
      result.source ?? 'manual',
      new Date().toISOString(),
    ],
  );
  await persistDbWrites();
  return { ok: true };
}

export function listScanHistory(profileId: number): ScanHistoryEntry[] {
  if (!isOwnedProfile(profileId)) return [];

  return getDb().getAllSync<ScanHistoryEntry>(
    'SELECT * FROM scan_history WHERE profileId = ? ORDER BY id DESC',
    [profileId],
  );
}
