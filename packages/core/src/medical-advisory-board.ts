/**
 * Medical advisory board registry (E.1).
 * Documents clinical oversight for thresholds, weights, and content.
 */

export const MEDICAL_ADVISORY_BOARD_VERSION = '2026-1';

export type AdvisoryReviewDomain =
  | 'wellness-weights'
  | 'pollen-thresholds'
  | 'clinical-scales'
  | 'scanner-risk'
  | 'cross-reactions'
  | 'expert-content'
  | 'disclaimers';

export interface AdvisoryBoardMember {
  id: string;
  name: string;
  role: string;
  affiliation: string;
  domains: AdvisoryReviewDomain[];
  /** ISO date of last documented review cycle. */
  lastReviewedAt: string;
}

export interface AdvisoryBoardCharter {
  version: string;
  scope: string;
  reviewCadenceMonths: number;
  escalationContact: string;
}

export const ADVISORY_BOARD_CHARTER: AdvisoryBoardCharter = {
  version: MEDICAL_ADVISORY_BOARD_VERSION,
  scope:
    'Clinical review of wellness scoring weights, pollen/AQI thresholds, scanner risk rules, ' +
    'cross-reaction data, expert articles, and patient-facing disclaimers.',
  reviewCadenceMonths: 6,
  escalationContact: 'support@allerguide.app',
};

/** Chair and extended panel — aligned with ADAIR expert content. */
export const MEDICAL_ADVISORY_BOARD: AdvisoryBoardMember[] = [
  {
    id: 'smolkin',
    name: 'д.м.н., проф. Юрий Соломонович Смолкин',
    role: 'Председатель консультативного совета',
    affiliation: 'АДАИР, НККЦ',
    domains: ['wellness-weights', 'pollen-thresholds', 'clinical-scales', 'expert-content', 'disclaimers'],
    lastReviewedAt: '2026-06-01',
  },
  {
    id: 'allergology-panel',
    name: 'Панель аллергологов АДАИР',
    role: 'Клинический рецензент',
    affiliation: 'АДАИР',
    domains: ['cross-reactions', 'scanner-risk', 'clinical-scales'],
    lastReviewedAt: '2026-06-01',
  },
  {
    id: 'data-steward',
    name: 'AllerGuide Clinical Data Steward',
    role: 'Куратор evidence registry',
    affiliation: 'AllerGuide',
    domains: ['wellness-weights', 'pollen-thresholds', 'scanner-risk'],
    lastReviewedAt: '2026-06-01',
  },
];

export function getAdvisoryMembersForDomain(domain: AdvisoryReviewDomain): AdvisoryBoardMember[] {
  return MEDICAL_ADVISORY_BOARD.filter((member) => member.domains.includes(domain));
}

export function getAdvisoryBoardMember(id: string): AdvisoryBoardMember | undefined {
  return MEDICAL_ADVISORY_BOARD.find((member) => member.id === id);
}
