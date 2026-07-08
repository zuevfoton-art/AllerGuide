import { describe, expect, it } from 'vitest';
import { EXPERT_ARTICLES } from './expert-content';
import {
  GINA_ACT_GOOD_MIN,
  GINA_ACT_PARTIAL_MIN,
  GINA_ACT_UNCONTROLLED_MAX,
  GINA_ASTHMA_EXPERT_ARTICLE_IDS,
  GINA_PEF_GREEN_MIN_PERCENT,
  GINA_PEF_YELLOW_MIN_PERCENT,
  classifyActScoreGina,
  isGinaAsthmaExpertArticle,
} from './gina-asthma';
import { PEF_ZONE_GREEN_MIN_PERCENT, PEF_ZONE_YELLOW_MIN_PERCENT } from './pef-zones';

describe('GINA asthma governance', () => {
  it('classifies ACT scores per GINA bands', () => {
    expect(classifyActScoreGina(22)?.level).toBe('good');
    expect(classifyActScoreGina(20)?.level).toBe('good');
    expect(classifyActScoreGina(18)?.level).toBe('partial');
    expect(classifyActScoreGina(16)?.level).toBe('partial');
    expect(classifyActScoreGina(15)?.level).toBe('uncontrolled');
    expect(classifyActScoreGina(10)?.level).toBe('uncontrolled');
  });

  it('keeps ACT thresholds consistent with GINA constants', () => {
    expect(GINA_ACT_GOOD_MIN).toBe(20);
    expect(GINA_ACT_PARTIAL_MIN).toBe(16);
    expect(GINA_ACT_UNCONTROLLED_MAX).toBe(15);
  });

  it('keeps PEF zone thresholds aligned with pef-zones module', () => {
    expect(PEF_ZONE_GREEN_MIN_PERCENT).toBe(GINA_PEF_GREEN_MIN_PERCENT);
    expect(PEF_ZONE_YELLOW_MIN_PERCENT).toBe(GINA_PEF_YELLOW_MIN_PERCENT);
  });

  it('registers all asthma expert articles with GINA reference in body or tags', () => {
    for (const id of GINA_ASTHMA_EXPERT_ARTICLE_IDS) {
      expect(isGinaAsthmaExpertArticle(id)).toBe(true);
      const article = EXPERT_ARTICLES.find((a) => a.id === id);
      expect(article, `missing expert article ${id}`).toBeDefined();
      const mentionsGina =
        article!.body.toLowerCase().includes('gina') ||
        article!.tags.some((tag) => tag.toLowerCase().includes('gina'));
      expect(mentionsGina, `${id} must mention GINA in body or tags`).toBe(true);
    }
  });
});
