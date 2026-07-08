import { describe, expect, it } from 'vitest';
import {
  buildConditionHistoryFromOnboarding,
  conditionHistoryToDraftMap,
  createDefaultConditionHistory,
  formatConditionHistoryReportText,
  normalizeConditionEpisodeInput,
  parseConditionHistory,
  reconcileConditionHistory,
  serializeConditionHistory,
} from './condition-history';

describe('condition-history', () => {
  it('creates default episodes for selected conditions', () => {
    const history = createDefaultConditionHistory(['food', 'asthma']);
    expect(history.episodes).toHaveLength(2);
    expect(history.episodes[0]?.onsetKind).toBe('unknown');
    expect(history.episodes[0]?.status).toBe('active');
  });

  it('builds history from onboarding drafts', () => {
    const history = buildConditionHistoryFromOnboarding(['food', 'pollinosis'], {
      food: {
        onsetKind: 'infancy',
        onsetYear: 2018,
        status: 'active',
        diagnosedBy: 'clinician',
        foodSymptomTiming: 'within-30min',
      },
      pollinosis: { onsetKind: 'school-age', status: 'active', diagnosedBy: 'self_reported' },
    });

    expect(history.episodes).toHaveLength(2);
    const food = history.episodes.find((item) => item.conditionId === 'food');
    expect(food?.onsetYear).toBe(2018);
    expect(food?.foodSymptomTiming).toBe('within-30min');
  });

  it('round-trips JSON serialization', () => {
    const source = buildConditionHistoryFromOnboarding(['urticaria'], {
      urticaria: { onsetKind: 'adulthood', status: 'active', diagnosedBy: 'specific_ige' },
    });
    const parsed = parseConditionHistory(serializeConditionHistory(source));
    expect(parsed?.episodes).toEqual(source.episodes);
  });

  it('reconciles episodes when conditions change', () => {
    const history = buildConditionHistoryFromOnboarding(['food', 'asthma'], {
      food: { onsetKind: 'infancy', status: 'active', diagnosedBy: 'self_reported' },
      asthma: { onsetKind: 'school-age', status: 'active', diagnosedBy: 'clinician' },
    });

    const next = reconcileConditionHistory(history, ['food', 'urticaria']);
    expect(next.episodes.map((item) => item.conditionId)).toEqual(['food', 'urticaria']);
    expect(getEpisode(next, 'food')?.onsetKind).toBe('infancy');
    expect(getEpisode(next, 'urticaria')?.onsetKind).toBe('unknown');
  });

  it('formats report text with food timing', () => {
    const text = formatConditionHistoryReportText(
      buildConditionHistoryFromOnboarding(['food'], {
        food: {
          onsetKind: 'early-childhood',
          status: 'active',
          diagnosedBy: 'self_reported',
          foodSymptomTiming: '30min-2h',
        },
      }),
    );
    expect(text).toContain('Пищевая аллергия');
    expect(text).toContain('30 минут — 2 часа');
  });

  it('converts history to draft map for UI', () => {
    const history = buildConditionHistoryFromOnboarding(['asthma'], {
      asthma: { onsetKind: 'adolescence', onsetYear: 2012, status: 'in-remission', diagnosedBy: 'clinician' },
    });
    const drafts = conditionHistoryToDraftMap(history);
    expect(drafts.asthma?.onsetYear).toBe(2012);
    expect(drafts.asthma?.status).toBe('in-remission');
  });

  it('ignores invalid JSON', () => {
    expect(parseConditionHistory('not-json')).toBeNull();
    expect(parseConditionHistory(JSON.stringify({ v: 2 }))).toBeNull();
  });

  it('normalizes partial episode input', () => {
    const episode = normalizeConditionEpisodeInput('drug', { onsetKind: 'adulthood' });
    expect(episode.conditionId).toBe('drug');
    expect(episode.diagnosedBy).toBe('self_reported');
    expect(episode.foodSymptomTiming).toBeUndefined();
  });
});

function getEpisode(
  history: ReturnType<typeof buildConditionHistoryFromOnboarding>,
  id: 'food' | 'urticaria' | 'asthma',
) {
  return history.episodes.find((item) => item.conditionId === id);
}
