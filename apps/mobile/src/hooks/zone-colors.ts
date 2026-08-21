import type {
  PollenTierLevel,
  RiskLevel,
  Severity0_3,
  WellnessLevel,
  WellnessVerbalTier,
} from '@allerguide/core';
import type { ThemeColors } from '@/src/constants/theme';

/**
 * Clinical information state. Action chrome stays on `colors.accent`.
 * Dark fills reuse the existing inverted triplets — do not invent a hex
 * if a fill reads poorly; report it.
 */
export type Zone = 'calm' | 'attention' | 'alarm';

export type ZoneColors = {
  fg: string;
  bg: string;
  border: string;
};

export function zoneFromWellnessLevel(level: WellnessLevel): Zone {
  if (level === 'good') return 'calm';
  if (level === 'high-risk') return 'alarm';
  return 'attention';
}

export function zoneFromWellnessVerbalTier(tier: WellnessVerbalTier): Zone | null {
  if (tier === 'low') return 'calm';
  if (tier === 'moderate') return 'attention';
  if (tier === 'high') return 'alarm';
  return null;
}

export function zoneFromPef(pefZone: 'green' | 'yellow' | 'red' | null | undefined): Zone | null {
  if (pefZone === 'green') return 'calm';
  if (pefZone === 'yellow') return 'attention';
  if (pefZone === 'red') return 'alarm';
  return null;
}

export function zoneFromPollen(level: PollenTierLevel): Zone {
  if (level === 'high') return 'alarm';
  if (level === 'mid') return 'attention';
  return 'calm';
}

export function zoneFromScanRisk(risk: RiskLevel): Zone {
  if (risk === 'high') return 'alarm';
  if (risk === 'medium') return 'attention';
  return 'calm';
}

export function zoneFromDiarySeverity(severity: Severity0_3 | null): Zone | null {
  if (severity === null) return null;
  if (severity >= 3) return 'alarm';
  if (severity === 2) return 'attention';
  return 'calm';
}

export function diaryOutcomeMessageKey(
  severity: Severity0_3,
): 'diary.outcomeNone' | 'diary.outcomeMild' | 'diary.outcomeModerate' | 'diary.outcomeSevere' {
  if (severity === 0) return 'diary.outcomeNone';
  if (severity === 1) return 'diary.outcomeMild';
  if (severity === 2) return 'diary.outcomeModerate';
  return 'diary.outcomeSevere';
}

export function resolveZoneColors(
  zone: Zone | null | undefined,
  colors: ThemeColors,
): ZoneColors | null {
  if (!zone) return null;
  if (zone === 'calm') {
    return { fg: colors.success, bg: colors.successLight, border: colors.successBorder };
  }
  if (zone === 'attention') {
    return { fg: colors.warning, bg: colors.warningLight, border: colors.warningBorder };
  }
  return { fg: colors.danger, bg: colors.dangerLight, border: colors.dangerBorder };
}
