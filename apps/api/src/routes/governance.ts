import type { Express, Request, Response } from 'express';
import {
  ADVISORY_BOARD_CHARTER,
  EVIDENCE_REGISTRY_VERSION,
  EVIDENCE_REGISTRY,
  formatDisclaimerFootnote,
  GOLDEN_SCENARIO_COUNT,
  MEDICAL_ADVISORY_BOARD,
  MEDICAL_ADVISORY_BOARD_VERSION,
  MEDICAL_DISCLAIMER_VERSION,
  MDR_CLASSIFICATION,
} from '@allerguide/core';

export function registerGovernanceRoutes(app: Express) {
  app.get('/api/governance', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      advisoryBoard: {
        version: MEDICAL_ADVISORY_BOARD_VERSION,
        charter: ADVISORY_BOARD_CHARTER,
        members: MEDICAL_ADVISORY_BOARD,
      },
      evidenceRegistry: {
        version: EVIDENCE_REGISTRY_VERSION,
        entryCount: EVIDENCE_REGISTRY.length,
        entries: EVIDENCE_REGISTRY,
      },
      disclaimer: {
        version: MEDICAL_DISCLAIMER_VERSION,
        classification: MDR_CLASSIFICATION,
        footnote: formatDisclaimerFootnote(),
      },
      goldenScenarios: {
        coreCount: GOLDEN_SCENARIO_COUNT,
        note: 'Scanner scenarios counted separately in @allerguide/ai',
      },
    });
  });
}
