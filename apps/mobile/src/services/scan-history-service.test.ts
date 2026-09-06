import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanResult } from '@allerguide/ai';

const scanRows: {
  id: number;
  profileId: number;
  mode: string;
  input: string;
  verdict: string;
  matches: string;
  level: string;
  productName: string | null;
  source: string;
  createdAt: string;
}[] = [];

let nextId = 1;
const persistDbWrites = vi.fn(async () => undefined);
const ownedProfileIds = [7];

const runSync = vi.fn((sql: string, params: unknown[] = []) => {
  if (sql.startsWith('INSERT INTO scan_history')) {
    const [profileId, mode, input, verdict, matches, level, productName, source, createdAt] =
      params as [number, string, string, string, string, string, string | null, string, string];
    scanRows.push({
      id: nextId++,
      profileId,
      mode,
      input,
      verdict,
      matches,
      level,
      productName,
      source,
      createdAt,
    });
  }
});

const getAllSync = vi.fn((sql: string, params: unknown[] = []) => {
  if (sql.includes('FROM profiles WHERE userId')) {
    return ownedProfileIds.map((id) => ({ id }));
  }
  if (sql.includes('FROM scan_history WHERE profileId')) {
    return scanRows.filter((row) => row.profileId === params[0]).sort((a, b) => b.id - a.id);
  }
  return [];
});

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({ runSync, getAllSync, getFirstSync: vi.fn() }),
  persistDbWrites: () => persistDbWrites(),
}));

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 3,
}));

const result: ScanResult = {
  verdict: 'осторожно',
  reason: 'молоко',
  matches: ['Молоко'],
  crossMatches: ['Яблоко'],
  traceMatches: ['Орехи'],
  mode: 'product',
  level: 'high',
  productName: 'Йогурт',
  source: 'barcode',
};

describe('scan-history-service', () => {
  beforeEach(() => {
    scanRows.length = 0;
    nextId = 1;
    ownedProfileIds.splice(0, ownedProfileIds.length, 7);
    runSync.mockClear();
    getAllSync.mockClear();
    persistDbWrites.mockClear();
  });

  it('rejects history writes for a profile the user does not own', async () => {
    const { saveScanHistory, listScanHistory } = await import('./scan-history-service');
    const saved = await saveScanHistory(99, '4601234567890', result);
    expect(saved).toEqual({ ok: false, code: 'profile_not_found' });
    expect(runSync).not.toHaveBeenCalled();
    expect(listScanHistory(99)).toEqual([]);
  });

  it('persists structured matches and flushes web writes', async () => {
    const { saveScanHistory, listScanHistory, historyEntryToScanResult } = await import(
      './scan-history-service'
    );

    const saved = await saveScanHistory(7, '4601234567890', result, 'Йогурт', {
      composition: 'молоко, сахар',
    });
    expect(saved).toEqual({ ok: true });
    expect(persistDbWrites).toHaveBeenCalledTimes(1);

    const [entry] = listScanHistory(7);
    expect(entry.input).toBe('4601234567890');
    expect(JSON.parse(entry.matches)).toMatchObject({
      direct: ['Молоко'],
      cross: ['Яблоко'],
      trace: ['Орехи'],
      composition: 'молоко, сахар',
    });

    expect(historyEntryToScanResult(entry)).toMatchObject({
      matches: ['Молоко'],
      crossMatches: ['Яблоко'],
      traceMatches: ['Орехи'],
      productIngredients: 'молоко, сахар',
      source: 'barcode',
    });
  });

  it('restores a legacy flat matches array as direct hits', async () => {
    const { historyEntryToScanResult } = await import('./scan-history-service');
    const restored = historyEntryToScanResult({
      id: 1,
      profileId: 7,
      mode: 'product',
      input: 'молоко',
      verdict: 'ok',
      matches: JSON.stringify(['Молоко']),
      level: 'low',
      productName: null,
      source: 'manual',
      createdAt: new Date().toISOString(),
    });

    expect(restored.matches).toEqual(['Молоко']);
    expect(restored.crossMatches).toEqual([]);
  });
});
