import { describe, expect, it } from 'vitest';
import { computeDiaryStats } from './diary-stats';
import { encodeDiaryDetails } from './diary';

describe('diary stats', () => {
  it('computes totals and recent symptoms', () => {
    const stats = computeDiaryStats([
      {
        id: 1,
        profileId: 1,
        type: 'Симптомы',
        details: encodeDiaryDetails({ symptoms: 'Зуд' }),
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        profileId: 1,
        type: 'Питание',
        details: encodeDiaryDetails({ food: 'Суп' }),
        createdAt: new Date().toISOString(),
      },
    ]);

    expect(stats.totalEntries).toBe(2);
    expect(stats.entriesLast7Days).toBe(2);
    expect(stats.recentSymptoms).toContain('Зуд');
    expect(stats.topFoodItems).toContain('Суп');
  });
});
