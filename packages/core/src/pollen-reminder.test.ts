import { describe, expect, it } from 'vitest';
import {
  collectPollenReminderTrigger,
  evaluatePollenAlert,
  parsePollenAlertThreshold,
  pollenLevelMeetsThreshold,
} from './pollen-reminder';

describe('pollen-reminder', () => {
  it('evaluates profile-relevant pollen against threshold', () => {
    const highOnly = evaluatePollenAlert(
      [{ label: 'Берёза', value: 90, profileRelevant: true, taxonId: 'birch_pollen' }],
      'high',
    );
    expect(highOnly.shouldAlert).toBe(true);
    expect(highOnly.primaryLabel).toBe('Берёза');

    const moderateGate = evaluatePollenAlert(
      [{ label: 'Берёза', value: 20, profileRelevant: true, taxonId: 'birch_pollen' }],
      'high',
    );
    expect(moderateGate.shouldAlert).toBe(false);

    const moderatePass = evaluatePollenAlert(
      [{ label: 'Берёза', value: 20, profileRelevant: true, taxonId: 'birch_pollen' }],
      'moderate',
    );
    expect(moderatePass.shouldAlert).toBe(true);
  });

  it('ignores non-profile pollen', () => {
    const result = evaluatePollenAlert(
      [{ label: 'Берёза', value: 90, profileRelevant: false, taxonId: 'birch_pollen' }],
      'moderate',
    );
    expect(result.shouldAlert).toBe(false);
  });

  it('schedules pollen reminder for next slot', () => {
    const noon = new Date('2026-06-25T12:00:00');
    const trigger = collectPollenReminderTrigger(
      1,
      { shouldAlert: true, primaryLabel: 'Берёза', primaryLevel: 'high' },
      7,
      30,
      noon,
    );
    expect(trigger?.kind).toBe('pollen');
    expect(trigger?.at.getDate()).toBe(26);
    expect(trigger?.at.getHours()).toBe(7);
  });

  it('checks threshold helper', () => {
    expect(pollenLevelMeetsThreshold('mid', 'moderate')).toBe(true);
    expect(pollenLevelMeetsThreshold('mid', 'high')).toBe(false);
  });

  it('defaults pollen threshold to high', () => {
    expect(parsePollenAlertThreshold(null)).toBe('high');
    expect(parsePollenAlertThreshold(undefined)).toBe('high');
    expect(parsePollenAlertThreshold('')).toBe('high');
    expect(parsePollenAlertThreshold('moderate')).toBe('moderate');
  });
});
