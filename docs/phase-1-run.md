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

**Далее:** P1.6 API integration tests · P1.7 closed beta gate
