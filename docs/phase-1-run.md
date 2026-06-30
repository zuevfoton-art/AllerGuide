# Phase 1 — run log

| ID | Статус | Артефакт |
|----|--------|----------|
| P1.2a | Done | [`docs/adr/001-dual-write.md`](./adr/001-dual-write.md) |
| P1.2b | Done | [`eas-staging-build.md`](./eas-staging-build.md) |
| P1.2c | Done | `restoreAuthSession`, QA § staging, `staging-auth-smoke.sh` |
| P1.2d | Done | `refreshProfilesFromBackend`, `ProfileServiceError`, tests |
| P1.2e | Done | QA § P1.2e offline regression |
| P1.3a | Done | `backup-crypto.ts` recovery API |
| P1.3b | Done | `RecoveryKeyModal`, `CloudBackupCard` |
| P1.3c | Done | `downloadBackup({ recoveryKey })` |
| P1.3e | Done | migrate flow in `CloudBackupCard` |
| P1.4a | Done | Health `features.sync`, JWT-only sync on staging, `staging-smoke.sh` |
| P1.4b | Done | `staging-sync-smoke.ts`, `sync-encrypted-e2e.test.ts`, mobile 503 → `sync_disabled` |
| P1.4c | Done | QA § P1.4c cross-device sync |
| P1.4d | Done | [`docs/adr/002-sync-conflict-policy.md`](./adr/002-sync-conflict-policy.md) |
| P1.5a | Done | `.env.staging.example`, health `features.aiScan`, staging smoke |
| P1.5b | Done | mobile JWT → `/api/scan`, `staging-scan-smoke.ts`, QA § P1.5b |
| P1.5c | Done | scan metrics in health + cache hit logging |
| P1.6a | Done | `auth.integration.test.ts` — register/login/me |
| P1.6b | Done | `sync.integration.test.ts` — Postgres backup + IDOR |
| P1.6c | Done | `scan.integration.test.ts` — JWT scan, cache, budget |
| P1.6d | Done | CI job `api-integration` + Postgres 16 service |
| P1.7 | Ready | [`closed-beta-p17.md`](./closed-beta-p17.md), `staging-preflight.sh`, QA § P1.7, beta issue template |

**Phase 1 code complete.** P1.7 gate out = 10–20 тестеров на staging (ops).  
**Staging infra plan:** [`staging-infrastructure-plan.md`](./staging-infrastructure-plan.md)  
**Далее:** [Phase 2](roadmap-to-prod.md) — P2.1 Maestro E2E, P2.2 mobile unit tests gate, Sentry.
