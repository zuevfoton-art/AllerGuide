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

| Artifact | Status (2026-07-29) |
|----------|---------------------|
| CI green on `main` | ⚠️ Required — remote Actions **billing blocked**; local `pnpm rc-gate` PASS |
| Maestro E2E nightly | ❌ Required — **BLOCKED** (see [staging-soak-log.md](./staging-soak-log.md)) |
| Sentry + analytics staging | ❌ Required — crash-free soak metrics not recorded |
| Security audits 0 critical | ✅ |
| Performance docs (cold start, Redis, web-store) | ✅ |
| Soak sign-off (P2.8 G7) | ❌ **BLOCKED** — Phase 3 kickoff not authorized |

## Immediate next steps

1. Clear soak blockers (Actions billing → Maestro green streak → Sentry ≥99% → testers) and replace **BLOCKED** in [staging-soak-log.md](./staging-soak-log.md).
2. Close GitHub milestone **Phase 2: Quality & Security** only after soak sign-off.
3. Open milestone **Phase 3: Compliance & Store**.
4. Create production EAS profile secrets (do not reuse staging Maestro recovery key).
5. Schedule legal review for medical disclaimer (P3.3).

See [roadmap-to-prod.md](./roadmap-to-prod.md#phase-3--compliance--store-readiness).
