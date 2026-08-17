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

1. Clear soak blockers (enable Maestro after [#259](https://github.com/zuevfoton-art/AllerGuide/pull/259) → Sentry DSN → testers). Keep **BLOCKED** in [staging-soak-log.md](./staging-soak-log.md) until sign-off.
2. Lawyer-review the `de`/`es`/`fr`/`it` legal drafts ([#260](https://github.com/zuevfoton-art/AllerGuide/pull/260)) before store copy (P3.2 / P3.3).
3. Recreate GitHub milestones/labels, then close **Phase 2** only after soak sign-off and open **Phase 3**.
4. Replace `ascAppId` / `appleTeamId` placeholders ([store-permissions-justification.md](./store-permissions-justification.md)) and create production EAS secrets (do not reuse the staging Maestro recovery key).
5. Use [privacy-compliance-audit.md](./privacy-compliance-audit.md) and [production-yc-plan.md](./production-yc-plan.md) as the P3.4 / P3.7 starting notes. YC stage Phase 5 is already green.

See [roadmap-to-prod.md](./roadmap-to-prod.md#phase-3--compliance--store-readiness).
