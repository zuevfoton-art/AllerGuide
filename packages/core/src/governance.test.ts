import { describe, expect, it } from 'vitest';
import {
  getAdvisoryMembersForDomain,
  MEDICAL_ADVISORY_BOARD,
  MEDICAL_ADVISORY_BOARD_VERSION,
} from './medical-advisory-board';
import { EVIDENCE_REGISTRY, getEvidenceForThreshold } from './evidence-registry';
import {
  formatDisclaimerFootnote,
  getMedicalDisclaimer,
  MEDICAL_DISCLAIMER_VERSION,
  MDR_CLASSIFICATION,
} from './medical-disclaimer';

describe('governance registry (E.1, E.2, E.5)', () => {
  it('defines advisory board with chair', () => {
    expect(MEDICAL_ADVISORY_BOARD.length).toBeGreaterThanOrEqual(2);
    expect(MEDICAL_ADVISORY_BOARD_VERSION).toMatch(/^\d{4}-\d+$/);
    expect(getAdvisoryMembersForDomain('wellness-weights').length).toBeGreaterThan(0);
  });

  it('links evidence entries to thresholds', () => {
    expect(EVIDENCE_REGISTRY.length).toBeGreaterThanOrEqual(10);
    expect(getEvidenceForThreshold('pollen.birch_pollen.lowMax').length).toBeGreaterThan(0);
  });

  it('declares MDR decision-support classification', () => {
    expect(MDR_CLASSIFICATION.euMdrStatus).toBe('not-a-medical-device');
    expect(MEDICAL_DISCLAIMER_VERSION).toBe('mdr-v2');
    expect(getMedicalDisclaimer('scanner').short).toContain('сканер');
    expect(formatDisclaimerFootnote()).toContain('mdr-v2');
  });
});
