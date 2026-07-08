/**
 * Evidence registry — maps thresholds and weights to guidelines + versions (E.2).
 */

import { WELLNESS_WEIGHTS_VERSION } from './wellness-weights';

export const EVIDENCE_REGISTRY_VERSION = '2026-1';

export interface EvidenceEntry {
  id: string;
  /** Dot-path key, e.g. `pollen.birch_pollen.lowMax`. */
  thresholdKey: string;
  value: string;
  guideline: string;
  citation?: string;
  sourceVersion: string;
  reviewedAt: string;
  reviewedBy?: string;
}

export const EVIDENCE_REGISTRY: EvidenceEntry[] = [
  {
    id: 'pollen-birch-low',
    thresholdKey: 'pollen.birch_pollen.lowMax',
    value: '15 grains/m³',
    guideline: 'EAACI / GA²LEN pollen alert literature',
    citation: 'B.3 pollen-thresholds.ts',
    sourceVersion: 'B.3',
    reviewedAt: '2026-06-01',
    reviewedBy: 'smolkin',
  },
  {
    id: 'pollen-birch-mid',
    thresholdKey: 'pollen.birch_pollen.midMax',
    value: '80 grains/m³',
    guideline: 'EAACI / GA²LEN pollen alert literature',
    sourceVersion: 'B.3',
    reviewedAt: '2026-06-01',
    reviewedBy: 'smolkin',
  },
  {
    id: 'pollen-grass-low',
    thresholdKey: 'pollen.grass_pollen.lowMax',
    value: '5 grains/m³',
    guideline: 'EAACI / GA²LEN grass pollen tiers',
    sourceVersion: 'B.3',
    reviewedAt: '2026-06-01',
  },
  {
    id: 'wellness-pollen-high',
    thresholdKey: 'wellness.weights.pollen.high',
    value: '28 penalty points',
    guideline: 'AllerGuide beta calibration panel',
    sourceVersion: WELLNESS_WEIGHTS_VERSION,
    reviewedAt: '2026-06-01',
    reviewedBy: 'smolkin',
  },
  {
    id: 'wellness-act-uncontrolled',
    thresholdKey: 'wellness.weights.clinicalScale.uncontrolled',
    value: '22 penalty points',
    guideline: 'GINA ACT control bands → wellness penalty mapping',
    citation: 'clinical-scales.ts ACT ≥20 good, ≥16 moderate',
    sourceVersion: WELLNESS_WEIGHTS_VERSION,
    reviewedAt: '2026-06-01',
    reviewedBy: 'allergology-panel',
  },
  {
    id: 'wellness-aria-severe',
    thresholdKey: 'wellness.weights.clinicalScale.severe',
    value: '16 penalty points',
    guideline: 'ARIA-lite symptom sum → wellness penalty',
    citation: 'ARIA-lite total >7 severe band',
    sourceVersion: WELLNESS_WEIGHTS_VERSION,
    reviewedAt: '2026-06-01',
  },
  {
    id: 'aqi-eu-high',
    thresholdKey: 'wellness.aqi.high',
    value: 'EAQI >75 → high tier',
    guideline: 'EEA European Air Quality Index',
    sourceVersion: 'B.4',
    reviewedAt: '2026-06-01',
  },
  {
    id: 'eu14-allergen-map',
    thresholdKey: 'regulatory.eu14',
    value: '14 mandatory allergens',
    guideline: 'EU Reg. 1169/2011 Annex II',
    sourceVersion: 'A.2',
    reviewedAt: '2026-06-01',
  },
  {
    id: 'fda9-allergen-map',
    thresholdKey: 'regulatory.fda9',
    value: 'Big 9 allergens',
    guideline: 'FDA FALCPA',
    sourceVersion: 'A.2',
    reviewedAt: '2026-06-01',
  },
  {
    id: 'scanner-false-positive-target',
    thresholdKey: 'scanner.golden.falsePositiveRate',
    value: '<10%',
    guideline: 'AllerGuide golden clinical scenario suite (E.3)',
    sourceVersion: 'E.3',
    reviewedAt: '2026-06-01',
  },
  {
    id: 'beta-rho-target',
    thresholdKey: 'wellness.beta.actAriaRho',
    value: 'ρ ≥ 0.5',
    guideline: 'Beta calibration: wellness burden ↔ ACT/ARIA',
    sourceVersion: 'E.4',
    reviewedAt: '2026-06-01',
    reviewedBy: 'data-steward',
  },
  {
    id: 'pef-zone-green',
    thresholdKey: 'pef.zone.greenMinPercent',
    value: '≥80% of personal best',
    guideline: 'GINA PEF traffic-light zones (decision support)',
    citation: 'pef-zones.ts',
    sourceVersion: 'GINA-2024',
    reviewedAt: '2026-07-01',
    reviewedBy: 'allergology-panel',
  },
  {
    id: 'pef-zone-yellow',
    thresholdKey: 'pef.zone.yellowMinPercent',
    value: '50–79% of personal best',
    guideline: 'GINA PEF traffic-light zones (decision support)',
    citation: 'pef-zones.ts',
    sourceVersion: 'GINA-2024',
    reviewedAt: '2026-07-01',
    reviewedBy: 'allergology-panel',
  },
  {
    id: 'pef-zone-red',
    thresholdKey: 'pef.zone.redMaxPercent',
    value: '<50% of personal best',
    guideline: 'GINA PEF traffic-light zones (decision support)',
    citation: 'pef-zones.ts',
    sourceVersion: 'GINA-2024',
    reviewedAt: '2026-07-01',
    reviewedBy: 'allergology-panel',
  },
];

export function getEvidenceForThreshold(thresholdKey: string): EvidenceEntry[] {
  return EVIDENCE_REGISTRY.filter(
    (entry) => entry.thresholdKey === thresholdKey || entry.thresholdKey.startsWith(`${thresholdKey}.`),
  );
}

export function getEvidenceById(id: string): EvidenceEntry | undefined {
  return EVIDENCE_REGISTRY.find((entry) => entry.id === id);
}

export function listEvidenceByGuideline(guideline: string): EvidenceEntry[] {
  const term = guideline.toLowerCase();
  return EVIDENCE_REGISTRY.filter((entry) => entry.guideline.toLowerCase().includes(term));
}
