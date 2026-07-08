import { describe, expect, it } from 'vitest';
import { buildConditionHistoryFromOnboarding } from './condition-history';
import { resolveClinicalPhenotypes } from './clinical-phenotypes';

describe('clinical-phenotypes', () => {
  it('P1: atopic-march-child — dermatitis → rhinitis → asthma in child', () => {
    const history = buildConditionHistoryFromOnboarding(
      ['dermatitis', 'rhinitis', 'asthma'],
      {
        dermatitis: { onsetKind: 'infancy', status: 'active', diagnosedBy: 'clinician' },
        rhinitis: { onsetKind: 'early-childhood', status: 'active', diagnosedBy: 'clinician' },
        asthma: { onsetKind: 'school-age', status: 'active', diagnosedBy: 'clinician' },
      },
      [
        { fromConditionId: 'dermatitis', toConditionId: 'rhinitis', relation: 'preceded' },
        { fromConditionId: 'rhinitis', toConditionId: 'asthma', relation: 'preceded' },
      ],
    );

    const result = resolveClinicalPhenotypes({
      conditionIds: ['dermatitis', 'rhinitis', 'asthma'],
      history,
      profileType: 'child',
    });

    expect(result.phenotypeIds).toContain('atopic-march-child');
  });

  it('P2: aria-asthma — rhinitis + asthma', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['rhinitis', 'asthma'],
    });

    expect(result.phenotypeIds).toContain('aria-asthma');
    expect(result.reassessmentHints.some((hint) => hint.includes('ACT'))).toBe(true);
  });

  it('P3: aria-conjunctivitis — rhinitis with ocular symptoms', () => {
    const history = buildConditionHistoryFromOnboarding(['rhinitis'], {
      rhinitis: {
        onsetKind: 'school-age',
        status: 'active',
        diagnosedBy: 'self_reported',
        ocularSymptoms: true,
      },
    });

    const result = resolveClinicalPhenotypes({
      conditionIds: ['rhinitis'],
      history,
    });

    expect(result.phenotypeIds).toContain('aria-conjunctivitis');
  });

  it('P4: food-anaphylaxis-risk — food + anaphylaxis history', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['food'],
      anaphylaxisHistory: true,
    });

    expect(result.phenotypeIds).toContain('food-anaphylaxis-risk');
    expect(result.reassessmentHints.length).toBeGreaterThan(0);
  });

  it('P5: pollen-food-oas — pollinosis + food + birch/apple cross', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['pollinosis', 'food'],
      allergenIds: ['birch-pollen', 'apple'],
    });

    expect(result.phenotypeIds).toContain('pollen-food-oas');
  });

  it('P6: dustmite-seafood — household + dust-mites + seafood', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['household'],
      allergenIds: ['dust-mites', 'seafood'],
    });

    expect(result.phenotypeIds).toContain('dustmite-seafood');
  });

  it('P7: insect-venom-severe — insect + anaphylaxis history', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['insect'],
      anaphylaxisHistory: true,
    });

    expect(result.phenotypeIds).toContain('insect-venom-severe');
  });

  it('P8: drug-respiratory — drug + asthma', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['drug', 'asthma'],
    });

    expect(result.phenotypeIds).toContain('drug-respiratory');
  });

  it('P9: adult-onset-food — food with adulthood debut', () => {
    const history = buildConditionHistoryFromOnboarding(['food'], {
      food: { onsetKind: 'adulthood', status: 'active', diagnosedBy: 'clinician' },
    });

    const result = resolveClinicalPhenotypes({
      conditionIds: ['food'],
      history,
    });

    expect(result.phenotypeIds).toContain('adult-onset-food');
    expect(result.reassessmentHints.some((hint) => hint.includes('взросл'))).toBe(true);
  });

  it('P10: polysensitized — ≥3 respiratory conditions + ≥2 allergen groups', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['rhinitis', 'pollinosis', 'asthma', 'household'],
      allergenIds: ['birch-pollen', 'dust-mites', 'milk'],
    });

    expect(result.phenotypeIds).toContain('polysensitized');
  });

  it('does not gate — returns empty when insufficient data', () => {
    const result = resolveClinicalPhenotypes({
      conditionIds: ['other'],
      allergenIds: [],
    });

    expect(result.phenotypeIds).toEqual([]);
    expect(result.phenotypes).toEqual([]);
  });
});
