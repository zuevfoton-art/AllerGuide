import type { ScanHistoryEntry } from './types';
import { findAllergenById } from './allergen-database';

export interface ScanTrendItem {
  allergenId: string;
  label: string;
  count: number;
}

export interface ScanTrendsSummary {
  topAllergens: ScanTrendItem[];
  totalScans: number;
  highRiskCount: number;
  periodDays: number;
}

function parseMatchLabels(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through
  }
  return raw.split(',').map((part) => part.trim()).filter(Boolean);
}

/**
 * Aggregate scan history trends for the last N days (default 30).
 */
export function computeScanTrends(
  history: ScanHistoryEntry[],
  periodDays = 30,
): ScanTrendsSummary {
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  const recent = history.filter((entry) => {
    const ts = Date.parse(entry.createdAt);
    return !Number.isNaN(ts) && ts >= cutoff;
  });

  const counts = new Map<string, number>();
  let highRiskCount = 0;

  for (const entry of recent) {
    if (entry.level === 'high') highRiskCount += 1;

    const labels = parseMatchLabels(entry.matches);
    for (const label of labels) {
      const key = label.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const topAllergens: ScanTrendItem[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => {
      const record = findAllergenById(label);
      return {
        allergenId: record?.id ?? label,
        label: record?.name ?? label,
        count,
      };
    });

  return {
    topAllergens,
    totalScans: recent.length,
    highRiskCount,
    periodDays,
  };
}

/**
 * Returns true when the same barcode was previously scanned as high-risk.
 */
export function wasBarcodePreviouslyHighRisk(
  history: ScanHistoryEntry[],
  barcode: string,
): boolean {
  const normalized = barcode.trim();
  if (!normalized) return false;

  return history.some(
    (entry) =>
      entry.input === normalized &&
      entry.level === 'high' &&
      entry.mode === 'product',
  );
}
