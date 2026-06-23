import { describe, expect, it } from 'vitest';
import { encodeDiaryDetails } from './diary';
import { buildTriggerContext, buildTriggerPrefill, extractTodayMedicines, formatTriggerContextLine } from './diary-triggers';
import type { DiaryEntry } from './types';

describe('diary triggers', () => {
  it('extracts today medicine entries', () => {
    const now = new Date('2026-06-20T15:00:00');
    const entries: DiaryEntry[] = [
      {
        id: 1,
        profileId: 1,
        type: 'Лекарство',
        details: encodeDiaryDetails({ medicine: 'Цетиризин', dosage: '10 мг' }),
        createdAt: '2026-06-20T08:00:00',
      },
      {
        id: 2,
        profileId: 1,
        type: 'Лекарство',
        details: encodeDiaryDetails({ medicine: 'Сальбутамол', dosage: '2 вдоха' }),
        createdAt: '2026-06-19T08:00:00',
      },
    ];
    expect(extractTodayMedicines(entries, now)).toEqual(['Цетиризин (10 мг)']);
  });

  it('builds trigger prefill from pollen, scan and meds', () => {
    const now = new Date('2026-06-20T15:00:00');
    const context = buildTriggerContext({
      pollenSummary: 'Берёза: высокий уровень',
      recentScan: {
        productName: 'Молочный шоколад',
        verdict: 'Опасно',
        level: 'high',
        createdAt: '2026-06-20T12:00:00',
      },
      todayMedicineEntries: [
        {
          id: 1,
          profileId: 1,
          type: 'Лекарство',
          details: encodeDiaryDetails({ medicine: 'Лоратадин', dosage: '10 мг' }),
          createdAt: '2026-06-20T09:00:00',
        },
      ],
      now,
    });

    const prefill = buildTriggerPrefill(context);
    expect(prefill.pollenContext).toContain('Берёза');
    expect(prefill.recentScan).toContain('шоколад');
    expect(prefill.todayMeds).toContain('Лоратадин');
    expect(prefill.context).toContain('Пыльца');
  });

  it('formats trigger context as a single line', () => {
    const line = formatTriggerContextLine({
      pollenSummary: 'Берёза: высокий',
      todayMedsSummary: 'Лоратадин',
    });
    expect(line).toContain('Пыльца');
    expect(line).toContain('Лоратадин');
  });
});
