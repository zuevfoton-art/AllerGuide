import { describe, expect, it } from 'vitest';
import { darkColors, lightColors } from '@/src/constants/theme';
import {
  diaryOutcomeMessageKey,
  resolveZoneColors,
  zoneFromDiarySeverity,
  zoneFromPef,
  zoneFromPollen,
  zoneFromScanRisk,
  zoneFromWellnessLevel,
  zoneFromWellnessVerbalTier,
} from './use-zone-colors';

describe('zone mappers', () => {
  it('maps wellness levels onto information zones', () => {
    expect(zoneFromWellnessLevel('good')).toBe('calm');
    expect(zoneFromWellnessLevel('moderate')).toBe('attention');
    expect(zoneFromWellnessLevel('attention')).toBe('attention');
    expect(zoneFromWellnessLevel('high-risk')).toBe('alarm');
  });

  it('maps verbal tiers and leaves none/unknown unzoned', () => {
    expect(zoneFromWellnessVerbalTier('low')).toBe('calm');
    expect(zoneFromWellnessVerbalTier('moderate')).toBe('attention');
    expect(zoneFromWellnessVerbalTier('high')).toBe('alarm');
    expect(zoneFromWellnessVerbalTier('none')).toBeNull();
    expect(zoneFromWellnessVerbalTier('unknown')).toBeNull();
  });

  it('maps PEF, pollen, scan risk, and diary severity', () => {
    expect(zoneFromPef('green')).toBe('calm');
    expect(zoneFromPef('yellow')).toBe('attention');
    expect(zoneFromPef('red')).toBe('alarm');
    expect(zoneFromPef(null)).toBeNull();

    expect(zoneFromPollen('low')).toBe('calm');
    expect(zoneFromPollen('mid')).toBe('attention');
    expect(zoneFromPollen('high')).toBe('alarm');

    expect(zoneFromScanRisk('low')).toBe('calm');
    expect(zoneFromScanRisk('medium')).toBe('attention');
    expect(zoneFromScanRisk('high')).toBe('alarm');

    expect(zoneFromDiarySeverity(0)).toBe('calm');
    expect(zoneFromDiarySeverity(1)).toBe('calm');
    expect(zoneFromDiarySeverity(2)).toBe('attention');
    expect(zoneFromDiarySeverity(3)).toBe('alarm');
    expect(zoneFromDiarySeverity(null)).toBeNull();
  });

  it('maps diary severity to outcome copy keys', () => {
    expect(diaryOutcomeMessageKey(0)).toBe('diary.outcomeNone');
    expect(diaryOutcomeMessageKey(1)).toBe('diary.outcomeMild');
    expect(diaryOutcomeMessageKey(2)).toBe('diary.outcomeModerate');
    expect(diaryOutcomeMessageKey(3)).toBe('diary.outcomeSevere');
  });
});

describe('resolveZoneColors', () => {
  it('returns null when no zone is set', () => {
    expect(resolveZoneColors(undefined, lightColors)).toBeNull();
    expect(resolveZoneColors(null, lightColors)).toBeNull();
  });

  it('uses existing clinical triplets in light and dark', () => {
    expect(resolveZoneColors('calm', lightColors)).toEqual({
      fg: lightColors.success,
      bg: lightColors.successLight,
      border: lightColors.successBorder,
    });
    expect(resolveZoneColors('attention', lightColors)).toEqual({
      fg: lightColors.warning,
      bg: lightColors.warningLight,
      border: lightColors.warningBorder,
    });
    expect(resolveZoneColors('alarm', lightColors)).toEqual({
      fg: lightColors.danger,
      bg: lightColors.dangerLight,
      border: lightColors.dangerBorder,
    });

    expect(resolveZoneColors('calm', darkColors)).toEqual({
      fg: darkColors.success,
      bg: darkColors.successLight,
      border: darkColors.successBorder,
    });
    expect(resolveZoneColors('attention', darkColors)).toEqual({
      fg: darkColors.warning,
      bg: darkColors.warningLight,
      border: darkColors.warningBorder,
    });
    expect(resolveZoneColors('alarm', darkColors)).toEqual({
      fg: darkColors.danger,
      bg: darkColors.dangerLight,
      border: darkColors.dangerBorder,
    });
  });

  it('reuses theme tokens instead of inventing values', () => {
    expect(resolveZoneColors('calm', lightColors)?.bg).toBe(lightColors.successLight);
    expect(resolveZoneColors('attention', darkColors)?.bg).toBe(darkColors.warningLight);
    expect(resolveZoneColors('alarm', darkColors)?.bg).toBe(darkColors.dangerLight);
  });
});
