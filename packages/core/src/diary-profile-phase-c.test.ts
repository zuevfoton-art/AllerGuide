import { describe, expect, it } from 'vitest';
import { isActPromptDue, getLastScaleEntryAt, ACT_PROMPT_INTERVAL_DAYS } from './diary-profile';
import { encodeDiaryDetails } from './diary';

describe('diary-profile ACT prompt (C.4)', () => {
  it('prompts when asthma and no ACT entry', () => {
    expect(isActPromptDue([], ['asthma'])).toBe(true);
    expect(isActPromptDue([], ['food'])).toBe(false);
  });

  it('prompts when last ACT is older than interval', () => {
    const old = new Date(Date.now() - (ACT_PROMPT_INTERVAL_DAYS + 1) * 86_400_000).toISOString();
    const entries = [
      {
        type: 'Шкала',
        details: encodeDiaryDetails({ scaleId: 'act', actActivity: '3' }),
        createdAt: old,
      },
    ];
    expect(isActPromptDue(entries, ['asthma'])).toBe(true);
    expect(getLastScaleEntryAt(entries, 'act')).toBe(old);
  });
});
