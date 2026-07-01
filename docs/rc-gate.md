# Release Candidate gate (P2.8)

Gate before closing **Phase 2** and starting **Phase 3** (store readiness).

## Criteria

| # | Criterion | Automated | Owner |
|---|-----------|-----------|-------|
| G1 | `pnpm typecheck` + `lint` + `test` green on `main` | ✅ `rc-gate-check.mjs` | CI |
| G2 | Mobile unit tests ≥30 | ✅ `mobile-test-gate.mjs` | CI |
| G3 | Maestro nightly green (offline + staging) | Manual — [Maestro Nightly](../.github/workflows/maestro-nightly.yml) | QA |
| G4 | Staging API health `200` | ✅ when `STAGING_API_URL` set | DevOps |
| G5 | Sentry staging crash-free **≥99%** over soak window | Manual — [soak log](./staging-soak-log.md) | Product |
| G6 | Security audits **0 critical** open | ✅ parses audit docs when present | Security |
| G7 | 2-week staging soak completed | Manual — soak log sign-off | Product |

## Run locally

```bash
# Full automated gate (same as CI)
node scripts/rc-gate-check.mjs

# Skip long test suite
node scripts/rc-gate-check.mjs --quick

# Include staging health
STAGING_API_URL=https://api.staging.allerguide.app node scripts/rc-gate-check.mjs
```

## CI

- **Every PR / push to `main`:** [CI](../.github/workflows/ci.yml) — typecheck, lint, test, mobile gate
- **Nightly:** [Maestro Nightly](../.github/workflows/maestro-nightly.yml) — E2E offline + staging
- **Weekly / manual:** [RC Gate](../.github/workflows/rc-gate.yml) — full automated gate + staging health

## RC build (staging soak)

1. Merge open Phase 2 PR (#104 P2.7) into `main`.
2. Deploy API staging ([deploy-staging](../.github/workflows/deploy-staging.yml)).
3. EAS RC build:
   ```bash
   cd apps/mobile
   eas build --profile staging --platform android
   ```
4. Distribute APK to internal testers; start [soak log](./staging-soak-log.md).
5. Configure `EXPO_PUBLIC_SENTRY_DSN` on staging EAS secrets before soak.

## Sign-off checklist

- [ ] Automated `rc-gate-check` green on release commit
- [ ] Maestro nightly green ≥7 consecutive days during soak
- [ ] Sentry crash-free ≥99% (staging, 14-day window)
- [ ] Security audit docs: 0 critical
- [ ] QA regression ([qa-checklist.md](./qa-checklist.md)) Pass on RC build
- [ ] Product sign-off in soak log

## After gate passes

→ [Phase 3 readiness](./phase-3-readiness.md) (EAS production certs, store metadata, GDPR).

## Related

- [phase-2-run.md](./phase-2-run.md) — Phase 2 task status
- [roadmap-to-prod.md](./roadmap-to-prod.md) — Phase 3 scope
