# Release Candidate gate (P2.8)

Gate before closing **Phase 2** and starting **Phase 3** (store readiness).

## Criteria

| # | Criterion | Automated | Owner | Status (2026-08-17) |
|---|-----------|-----------|-------|---------------------|
| G1 | `pnpm typecheck` + `lint` + `test` green | ✅ `rc-gate-check.mjs` | CI | ✅ CI on `main` green (2026-08-15) |
| G2 | Mobile unit tests ≥30 | ✅ `mobile-test-gate.mjs` | CI | ✅ 189 tests |
| G3 | Maestro nightly green (offline + staging) | Manual — [Maestro Nightly](../.github/workflows/maestro-nightly.yml) | QA | ❌ **BLOCKED** — workflow is `disabled_manually` (no runs after 2026-08-11). Fix: [#259](https://github.com/zuevfoton-art/AllerGuide/pull/259) (Ubuntu + KVM). After merge: `gh workflow enable maestro-nightly.yml` + `workflow_dispatch` |
| G4 | Staging API health `200` | ✅ when `STAGING_API_URL` set | DevOps | ✅ `https://api.staging.aclearo.com` |
| G5 | Sentry staging crash-free **≥99%** over soak window | Manual — [soak log](./staging-soak-log.md) | Product | ❌ **BLOCKED** — `EXPO_PUBLIC_SENTRY_DSN` not set in EAS `staging`, so no metrics exist |
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

**Ops note (2026-08-17):** the earlier Actions billing outage is over — CI and RC Gate run and pass on `main` (RC Gate `success` 2026-08-17). Manual criteria G3/G5/G7 remain **BLOCKED**, now for their own reasons: Maestro nightly cannot start its Android driver/emulator, and staging has no Sentry DSN. Fix order in [roadmap-to-prod.md §6](./roadmap-to-prod.md#6-дальнейшие-шаги).

## RC build (staging soak)

1. Automated gate green: `STAGING_API_URL=https://api.staging.aclearo.com pnpm rc-gate`.
2. Deploy API staging (YC — [`staging-yandex-cloud.md`](./staging-yandex-cloud.md)).
3. EAS RC build:
   ```bash
   cd apps/mobile
   eas build --profile staging --platform android
   ```
4. Distribute APK to internal testers; start / resume [soak log](./staging-soak-log.md) (clear **BLOCKED** when restarting a fresh 14-day window).
5. Complete the Sentry pre-soak checklist below, then rebuild the RC APK.

## Pre-soak: Sentry EAS variables (G5)

Runtime reads `EXPO_PUBLIC_SENTRY_DSN` in [`error-reporting.ts`](../apps/mobile/src/services/error-reporting.ts). The source-map plugin in [`app.config.js`](../apps/mobile/app.config.js) turns on only when `SENTRY_ORG` **and** `SENTRY_PROJECT` are set. All four values must exist on the EAS **project** (or `staging` environment) **before** the soak APK is built. Setting them requires `EXPO_TOKEN` / `eas login` — this environment cannot do it.

```bash
cd apps/mobile
# visibility: Sensitive for the DSN (it is public-by-design in the client bundle)
# visibility: Secret for SENTRY_AUTH_TOKEN
pnpm exec eas env:create --environment staging --name EXPO_PUBLIC_SENTRY_DSN --value "$SENTRY_DSN" --visibility sensitive
pnpm exec eas env:create --environment staging --name SENTRY_ORG --value "$SENTRY_ORG" --visibility sensitive
pnpm exec eas env:create --environment staging --name SENTRY_PROJECT --value "$SENTRY_PROJECT" --visibility sensitive
pnpm exec eas env:create --environment staging --name SENTRY_AUTH_TOKEN --value "$SENTRY_AUTH_TOKEN" --visibility secret
pnpm build:staging:android
```

| Variable | Where it is read | Why |
|----------|------------------|-----|
| `EXPO_PUBLIC_SENTRY_DSN` | `error-reporting.ts` | Crash/session events from the RC APK |
| `SENTRY_ORG` | `app.config.js` plugin | Upload source maps |
| `SENTRY_PROJECT` | `app.config.js` plugin | Upload source maps |
| `SENTRY_AUTH_TOKEN` | Sentry Expo plugin | Authenticate the map upload |

Do **not** start the 14-day soak until a staging event appears in the Sentry project (force a test crash or `Sentry.captureMessage` on a debug build). Without that, G5 has nothing to measure.

## Sign-off checklist

- [x] Automated `rc-gate-check` green locally (2026-07-29)
- [x] Automated RC Gate workflow green on GitHub (latest: `success` 2026-08-17)
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
