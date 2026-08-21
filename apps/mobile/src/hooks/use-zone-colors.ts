import { useTheme } from '@/src/hooks/use-theme';
import { resolveZoneColors, type Zone, type ZoneColors } from '@/src/hooks/zone-colors';

export type { Zone, ZoneColors };
export {
  diaryOutcomeMessageKey,
  resolveZoneColors,
  zoneFromDiarySeverity,
  zoneFromPef,
  zoneFromPollen,
  zoneFromScanRisk,
  zoneFromWellnessLevel,
  zoneFromWellnessVerbalTier,
} from '@/src/hooks/zone-colors';

/** Always call this hook — pass `null`/`undefined` when the surface has no zone. */
export function useZoneColors(zone?: Zone | null): ZoneColors | null {
  const { colors } = useTheme();
  return resolveZoneColors(zone, colors);
}
