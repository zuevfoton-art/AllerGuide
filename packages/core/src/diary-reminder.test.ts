import { describe, expect, it } from 'vitest';
import {
  clampReminderHour,
  clampReminderMinute,
  formatReminderClock,
  parseReminderHour,
  parseReminderMinute,
} from './diary-reminder';

describe('diary-reminder', () => {
  it('parses and clamps reminder clock parts', () => {
    expect(parseReminderHour('21')).toBe(21);
    expect(parseReminderHour('99')).toBe(23);
    expect(parseReminderHour('')).toBe(20);
    expect(parseReminderMinute('15')).toBe(15);
    expect(parseReminderMinute('-1')).toBe(0);
    expect(parseReminderMinute('abc')).toBe(0);
  });

  it('formats reminder clock', () => {
    expect(formatReminderClock(8, 5)).toBe('08:05');
    expect(formatReminderClock(20)).toBe('20:00');
    expect(clampReminderHour(-3)).toBe(0);
    expect(clampReminderMinute(90)).toBe(59);
  });
});
