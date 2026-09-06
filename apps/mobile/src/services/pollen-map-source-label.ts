import type { PollenMapSource } from '@/src/services/pollen-map-service';

export interface MapPollenSourceLabels {
  calendar: string;
  cache: string;
  openMeteo: string;
}

/**
 * Status-card source caption. Google Pollen is the primary map feed and is
 * not named in the UI; calendar / cache / Open-Meteo still need a label.
 */
export function resolveMapPollenSourceCaption(
  snapshotSource: PollenMapSource | null | undefined,
  upiSource: string | null | undefined,
  labels: MapPollenSourceLabels,
): string {
  if (!snapshotSource) return '';
  if (snapshotSource === 'calendar') return labels.calendar;
  if (snapshotSource === 'cache') return labels.cache;
  if (snapshotSource === 'google' || upiSource === 'google') return '';
  return labels.openMeteo;
}
