import { describe, expect, it } from 'vitest';
import { DRUG_REACTION_TYPE_CHOICES } from './food-drug-allergy';
import { getCrossReactionsFor } from './cross-reactions';

describe('Phase 4 catalog expansion', () => {
  it('exposes EAACI drug reaction type choices', () => {
    expect(DRUG_REACTION_TYPE_CHOICES).toContain('Немедленная (IgE)');
    expect(DRUG_REACTION_TYPE_CHOICES).toContain('Отсроченная (T-cell)');
    expect(DRUG_REACTION_TYPE_CHOICES).toContain('Кожная');
  });

  it('includes info-only FPIES syndrome cross-reactions', () => {
    const milkMatches = getCrossReactionsFor('milk');
    const fpies = milkMatches.find((item) => item.syndrome === 'fpies');
    expect(fpies?.note).toContain('FPIES');
  });

  it('includes info-only contact dermatitis syndrome notes', () => {
    const latexMatches = getCrossReactionsFor('latex');
    const contact = latexMatches.find((item) => item.syndrome === 'contact-dermatitis');
    expect(contact?.note).toContain('Контактный');
  });
});
