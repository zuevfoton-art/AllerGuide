# Release Candidate gate (P2.8)

Gate before closing **Phase 2** and starting **Phase 3** (store readiness).

## Criteria

| # | Criterion | Automated | Owner | Status (2026-07-29) |
|---|-----------|-----------|-------|---------------------|
| G1 | `pnpm typecheck` + `lint` + `test` green | ✅ `rc-gate-check.mjs` | CI | ✅ local PASS · ✅ CI on `main` green again (2026-07-29) |
| G2 | Mobile unit tests ≥30 | ✅ `mobile-test-gate.mjs` | CI | ✅ |
| G3 | Maestro nightly green (offline + staging) | Manual — [Maestro Nightly](../.github/workflows/maestro-nightly.yml) | QA | ❌ **BLOCKED** (0 green days in soak window) |
| G4 | Staging API health `200` | ✅ when `STAGING_API_URL` set | DevOps | ✅ `https://api.staging.aclearo.com` |
| G5 | Sentry staging crash-free **≥99%** over soak window | Manual — [soak log](./staging-soak-log.md) | Product | ❌ **BLOCKED** (no metrics recorded) |
| G6 | Security audits **0 critical** open | ✅ parses audit docs when present | Security | ✅ |
| G7 | 2-week staging soak completed | Manual — soak log sign-off | Product | ❌ **BLOCKED** — see [staging-soak-log.md](./staging-soak-log.md) |

## Run locally

```bash
# Full automated gate (same as CI)
STAGING_API_URL=https://api.staging.aclearo.com pnpm rc-gate

# Skip long test suite
node scripts/rc-gate-check.mjs --quick

# Explicit staging health
STAGING_API_URL=https://api.staging.aclearo.com node scripts/rc-gate-check.mjs
```

## CI

- **Every PR / push to `main`:** [CI](../.github/workflows/ci.yml) — typecheck, lint, test, mobile gate
- **Nightly:** [Maestro Nightly](../.github/workflows/maestro-nightly.yml) — E2E offline + staging
- **Weekly / manual:** [RC Gate](../.github/workflows/rc-gate.yml) — full automated gate + staging health

**Ops note (2026-07-29):** Actions billing blocked runners for most of the soak window; evening CI on `main` is green again. Manual soak criteria (G3/G5/G7) remain **BLOCKED**.

## RC build (staging soak)

1. Automated gate green: `STAGING_API_URL=https://api.staging.aclearo.com pnpm rc-gate`.
2. Deploy API staging (YC — [`staging-yandex-cloud.md`](./staging-yandex-cloud.md)).
3. EAS RC build:
   ```bash
   cd apps/mobile
   eas build --profile staging --platform android
   ```
4. Distribute APK to internal testers; start / resume [soak log](./staging-soak-log.md) (clear **BLOCKED** when restarting a fresh 14-day window).
5. Configure `EXPO_PUBLIC_SENTRY_DSN` on staging EAS secrets before soak.

## Sign-off checklist

- [x] Automated `rc-gate-check` green locally (2026-07-29)
- [x] Automated RC Gate workflow green on GitHub ([run 30490654726](https://github.com/zuevfoton-art/AllerGuide/actions/runs/30490654726))
- [ ] Maestro nightly green ≥7 consecutive days during soak
- [ ] Sentry crash-free ≥99% (staging, 14-day window)
- [x] Security audit docs: 0 critical
- [ ] QA regression ([qa-checklist.md](./qa-checklist.md)) Pass on RC build
- [ ] Product sign-off in soak log

**Phase 2 close:** not authorized while soak status is **BLOCKED**.

## After gate passes

→ [Phase 3 readiness](./phase-3-readiness.md) (EAS production certs, store metadata, GDPR).

## Related

- [phase-2-run.md](./phase-2-run.md) — Phase 2 task status
- [roadmap-to-prod.md](./roadmap-to-prod.md) — Phase 3 scope
- [staging-soak-log.md](./staging-soak-log.md) — soak BLOCKED + blockers
