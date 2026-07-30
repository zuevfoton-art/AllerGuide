import { describe, expect, it } from 'vitest';
import {
  filterFilledScheduleStages,
  insertScheduleLineAfter,
  isScheduleStageFilled,
  normalizeScheduleLines,
  removeScheduleLine,
  scheduleLinesToNotes,
  updateScheduleLine,
} from './therapy-schedule';

describe('therapy-schedule', () => {
  it('normalizes empty input to one blank row', () => {
    expect(normalizeScheduleLines()).toEqual(['']);
    expect(normalizeScheduleLines([], '')).toEqual(['']);
  });

  it('prefers non-empty lines and falls back to notes', () => {
    expect(normalizeScheduleLines(['a', '', 'b'])).toEqual(['a', 'b']);
    expect(normalizeScheduleLines([], 'one\ntwo')).toEqual(['one', 'two']);
  });

  it('joins notes and inserts a row after an index', () => {
    expect(scheduleLinesToNotes(['a', '', 'b'])).toBe('a\nb');
    expect(insertScheduleLineAfter(['a', 'b'], 0)).toEqual(['a', '', 'b']);
  });

  it('updates and removes rows safely', () => {
    expect(updateScheduleLine(['a', 'b'], 1, 'c')).toEqual(['a', 'c']);
    expect(removeScheduleLine(['a'], 0)).toEqual(['']);
    expect(removeScheduleLine(['a', 'b'], 0)).toEqual(['b']);
  });

  it('filters blank schedule stages used as editor seeds', () => {
    expect(isScheduleStageFilled({ from: '', to: '', dose: '' })).toBe(false);
    expect(
      filterFilledScheduleStages([
        { from: '', to: '', dose: '' },
        { from: '2026-01-01', to: '2026-02-01', dose: 'утро' },
      ]),
    ).toEqual([{ from: '2026-01-01', to: '2026-02-01', dose: 'утро' }]);
  });
});
