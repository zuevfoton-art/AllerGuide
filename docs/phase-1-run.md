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
| P1.3e | Done | migrate flow in `CloudBackupCard` (`usesLegacyDeviceKeyOnly`) |

**Далее:** P1.4a sync flags on staging infra · P1.4b E2E encrypted sync · P1.4c cross-device QA
