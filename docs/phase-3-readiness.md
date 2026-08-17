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
| P3.7 | Production API | `api.aclearo.com`, monitoring, backups |

## Prerequisites from Phase 2

| Artifact | Status (2026-08-17) |
|----------|---------------------|
| CI green on `main` | ✅ green (2026-08-15); RC Gate `success` 2026-08-17 |
| Maestro E2E nightly | ❌ Required — **BLOCKED**: emulator/driver startup failures (see [staging-soak-log.md](./staging-soak-log.md)) |
| Sentry + analytics staging | ❌ Required — analytics wired; `EXPO_PUBLIC_SENTRY_DSN` not set on EAS `staging` |
| Security audits 0 critical | ✅ |
| Performance docs (cold start, Redis, web-store) | ✅ |
| Soak sign-off (P2.8 G7) | ❌ **BLOCKED** — Phase 3 kickoff not authorized |

## Immediate next steps

Ordered plan lives in [roadmap-to-prod.md §6](./roadmap-to-prod.md#6-дальнейшие-шаги). Phase 3 specific:

1. Clear soak blockers (Maestro workflow fix → Sentry DSN → testers) and replace **BLOCKED** in [staging-soak-log.md](./staging-soak-log.md).
2. Finish P0.5 (legal `de`/`es`/`fr`/`it`) — it gates store descriptions in 6 locales (P3.2).
3. Recreate GitHub milestones/labels, then close **Phase 2** only after soak sign-off and open **Phase 3**.
4. Replace `ascAppId` / `appleTeamId` placeholders and create production EAS secrets (do not reuse the staging Maestro recovery key).
5. Schedule legal review for medical disclaimer (P3.3) and write the GDPR / 152-ФЗ deletion-and-export audit note (P3.4).

See [roadmap-to-prod.md](./roadmap-to-prod.md#phase-3--compliance--store-readiness).
