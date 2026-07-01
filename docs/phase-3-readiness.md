# Phase 3 readiness (post P2.8)

Unlocked after [RC gate](./rc-gate.md) and [2-week staging soak](./staging-soak-log.md) sign-off.

## Phase 3 scope (roadmap)

| ID | Task | First action |
|----|------|--------------|
| P3.1 | EAS production certs | Real Apple Team ID, `ascAppId`, signing credentials in EAS |
| P3.2 | Store metadata | Screenshots × 6 locales, descriptions, age rating |
| P3.3 | Medical disclaimer | Legal review of store listing + in-app disclaimer |
| P3.4 | Privacy compliance | GDPR + 152-ФЗ: export, account deletion, server wipe audit |
| P3.5 | Permissions justification | Camera, location, notifications — store review text |
| P3.6 | Soft launch | Closed beta 50–100 users, crash-free ≥99.5% |
| P3.7 | Production API | `api.allerguide.app`, monitoring, backups |

## Prerequisites from Phase 2

| Artifact | Status |
|----------|--------|
| CI green on `main` | Required |
| Maestro E2E nightly | Required |
| Sentry + analytics staging | Required |
| Security audits 0 critical | Required |
| Performance docs (cold start, Redis, web-store) | Required |

## Immediate next steps

1. Close GitHub milestone **Phase 2: Quality & Security**.
2. Open milestone **Phase 3: Compliance & Store**.
3. Create production EAS profile secrets (do not reuse staging Maestro recovery key).
4. Schedule legal review for medical disclaimer (P3.3).

See [roadmap-to-prod.md](./roadmap-to-prod.md#phase-3--compliance--store-readiness).
