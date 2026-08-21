import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

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
} from './zone-colors';

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

  it('keeps zone text readable on existing light and dark fills', () => {
    for (const colors of [lightColors, darkColors]) {
      for (const zone of ['calm', 'attention', 'alarm'] as const) {
        const pair = resolveZoneColors(zone, colors);
        expect(pair).not.toBeNull();
        expect(contrastRatio(pair!.fg, pair!.bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '');
  const n = Number.parseInt(raw, 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
