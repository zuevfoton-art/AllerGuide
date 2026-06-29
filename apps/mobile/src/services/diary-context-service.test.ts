import { describe, expect, it, vi } from 'vitest';
import { encodeDiaryDetails } from '@allerguide/core';
import {
  buildPollenSummaryFromFactors,
  getTriggerPrefillAnswers,
} from './diary-context-service';

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync: () => [],
    getFirstSync: () => null,
    runSync: () => undefined,
  }),
}));

vi.mock('@/src/services/scan-history-service', () => ({
  listScanHistory: () => [],
}));

describe('diary-context-service', () => {
  it('builds pollen summary from wellness factors', () => {
    const summary = buildPollenSummaryFromFactors([
      { label: 'Пыльца · Берёза', value: '42.0 зерен', level: 'high' },
      { label: 'Воздух', value: 'AQI 3', level: 'low' },
    ]);
    expect(summary).toContain('Берёза');
  });

  it('returns trigger prefill answers from context', () => {
    const prefill = getTriggerPrefillAnswers({
      pollenSummary: 'Берёза: высокий уровень',
      recentScanSummary: 'Шоколад: Опасно (high)',
      todayMedsSummary: 'Цетиризин (10 мг)',
    });

    expect(prefill.pollenContext).toContain('Берёза');
    expect(prefill.recentScan).toContain('Шоколад');
    expect(prefill.todayMeds).toContain('Цетиризин');
    expect(prefill.context).toContain('Пыльца');
  });
});

describe('diary-context-service integration helpers', () => {
  it('documents medicine encoding used for trigger linking', () => {
    const details = encodeDiaryDetails({ medicine: 'Лоратадин', dosage: '10 мг' });
    expect(details).toContain('Лоратадин');
  });
});
