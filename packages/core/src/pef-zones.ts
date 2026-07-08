/**
 * PEF traffic-light zones relative to personal best (GINA decision support).
 * Thresholds: green ≥80%, yellow 50–79%, red <50%.
 */

import {
  GINA_ASTHMA_ATTRIBUTION,
  GINA_ASTHMA_DISCLAIMER,
  GINA_PEF_GREEN_MIN_PERCENT,
  GINA_PEF_YELLOW_MIN_PERCENT,
} from './gina-asthma';

export type PefZone = 'green' | 'yellow' | 'red';

export const PEF_ZONE_GREEN_MIN_PERCENT = GINA_PEF_GREEN_MIN_PERCENT;
export const PEF_ZONE_YELLOW_MIN_PERCENT = GINA_PEF_YELLOW_MIN_PERCENT;

export const PEF_ZONE_DISCLAIMER = GINA_ASTHMA_DISCLAIMER;

export const ASTHMA_GINA_ATTRIBUTION = GINA_ASTHMA_ATTRIBUTION;

export function parsePefNumeric(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  }
  if (raw == null || !String(raw).trim()) return null;
  const num = Number(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}

export function computePefPercentOfBest(value: number, personalBest: number): number | null {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(personalBest) || personalBest <= 0) {
    return null;
  }
  return Math.round((value / personalBest) * 100);
}

export function computePefZone(value: number, personalBest: number): PefZone | null {
  const percent = computePefPercentOfBest(value, personalBest);
  if (percent == null) return null;
  if (percent >= PEF_ZONE_GREEN_MIN_PERCENT) return 'green';
  if (percent >= PEF_ZONE_YELLOW_MIN_PERCENT) return 'yellow';
  return 'red';
}

export function formatPefZoneLabel(zone: PefZone): string {
  switch (zone) {
    case 'green':
      return 'Зелёная зона';
    case 'yellow':
      return 'Жёлтая зона';
    case 'red':
      return 'Красная зона';
  }
}

export function formatPefZoneHint(zone: PefZone, percent: number | null): string {
  const pct = percent != null ? ` (${percent}% от лучшего)` : '';
  switch (zone) {
    case 'green':
      return `ПСВ в зелёной зоне${pct} — контроль стабилен по ориентирам GINA.`;
    case 'yellow':
      return `ПСВ в жёлтой зоне${pct} — возможно ухудшение контроля. Следуйте плану действий врача.`;
    case 'red':
      return `ПСВ в красной зоне${pct} — требуется срочная оценка. Следуйте плану действий и обратитесь к врачу.`;
  }
}

export function resolvePersonalBestPef(options: {
  explicitBest?: string | number | null;
  planBest?: string | number | null;
  entryBests?: (string | number | null | undefined)[];
  historicalValues?: number[];
}): number | null {
  const fromExplicit = parsePefNumeric(options.explicitBest);
  if (fromExplicit) return fromExplicit;

  const fromPlan = parsePefNumeric(options.planBest);
  if (fromPlan) return fromPlan;

  const fromEntries = (options.entryBests ?? [])
    .map((item) => parsePefNumeric(item))
    .filter((item): item is number => item != null);
  if (fromEntries.length) return Math.max(...fromEntries);

  const historical = (options.historicalValues ?? []).filter((item) => item > 0);
  if (historical.length) return Math.max(...historical);

  return null;
}
