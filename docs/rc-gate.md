# Release Candidate gate (P2.8)

Gate before closing **Phase 2** and starting **Phase 3** (store readiness).

## Criteria

| # | Criterion | Automated | Owner | Status (2026-08-17) |
|---|-----------|-----------|-------|---------------------|
| G1 | `pnpm typecheck` + `lint` + `test` green | ✅ `rc-gate-check.mjs` | CI | ✅ CI on `main` green (2026-08-15) |
| G1b | `trackEvent` names match `ANALYTICS_EVENT_NAMES` | ✅ `check-analytics-taxonomy.mjs` | Eng | ✅ wired into `pnpm rc-gate` |
| G1c | Design tokens (`fontSize`/`lineHeight` literals, title keys) stay on allowlist | ✅ `check-design-tokens.mjs` | Eng | ✅ wired into `pnpm rc-gate` |
| G2 | Mobile unit tests ≥30 | ✅ `mobile-test-gate.mjs` | CI | ✅ 189 tests |
| G3 | Maestro nightly green (offline + staging) | Manual — [Maestro Nightly](../.github/workflows/maestro-nightly.yml) | QA | ❌ **BLOCKED** — workflow is `disabled_manually` (no runs after 2026-08-11). Fix: [#259](https://github.com/zuevfoton-art/AllerGuide/pull/259) (Ubuntu + KVM). After merge: `gh workflow enable maestro-nightly.yml` + `workflow_dispatch` |
| G4 | Staging API health `200` JSON (`ok: true`) | ✅ when `STAGING_API_URL` set | DevOps | ✅ `https://api.staging.aclearo.com` — checker reports HTTP status + body snippet (YC Gateway HTML/plain text is a fail, not a JSON parse crash) |
| G5 | First-party crash-free **≥99%** over soak window (GlitchTip ingest + analytics `session_started` / `app_crashed`) | Manual — [soak log](./staging-soak-log.md) | Product | ❌ **BLOCKED** — GlitchTip VM/DSN not provisioned yet; formula is in the API dashboard (`crashFree`) |
| G6 | Security audits **0 critical** open | ✅ parses audit docs when present | Security | ✅ |
| G6b | Docs quote the live schema version + migration range | ✅ `rc-gate-doc-facts.mjs` | Eng | ✅ schema v10, migrations up to `0012` |
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
- **PR path-trigger** (this workflow’s `pull_request` paths): live staging health is a **warning**, so Maestro/docs PRs are not blocked when the YC API Gateway is stopped. `schedule` and `push` to `main` still hard-fail G4. Bodies are parsed by `scripts/rc-gate-health.mjs` (HTTP status + snippet, retries).

**Ops note:** Automated G1/G2/G4/G6 do **not** replace manual G3/G5/G7. G5 no longer depends on sentry.io. Crash grouping is self-hosted GlitchTip on Yandex Cloud; crash-free is first-party analytics. Runbook: [staging-glitchtip.md](./staging-glitchtip.md). Fix order in [roadmap-to-prod.md §6](./roadmap-to-prod.md#6-дальнейшие-шаги).

## RC build (staging soak)

1. Automated gate green: `STAGING_API_URL=https://api.staging.aclearo.com pnpm rc-gate`.
2. Deploy API staging (YC — [`staging-yandex-cloud.md`](./staging-yandex-cloud.md)).
3. EAS RC build:
   ```bash
   cd apps/mobile
   eas build --profile staging --platform android
   ```
4. Distribute APK to internal testers; start / resume [soak log](./staging-soak-log.md) (clear **BLOCKED** when restarting a fresh 14-day window).
5. Complete the GlitchTip pre-soak checklist below, then rebuild the RC APK.

## Pre-soak: GlitchTip + first-party crash-free (G5)

Crash **grouping** uses self-hosted GlitchTip at `https://errors.staging.aclearo.com` after owner apply ([staging-glitchtip.md](./staging-glitchtip.md)). Runtime reads `EXPO_PUBLIC_ERROR_DSN` (alias `EXPO_PUBLIC_SENTRY_DSN`) in [`error-reporting.ts`](../apps/mobile/src/services/error-reporting.ts). Hosts `sentry.io` / `*.sentry.io` are **refused**. Session tracking in the SDK is off — GlitchTip has no Release Health.

Crash-free for the gate:

```
crash_free = 1 - unique clients with app_crashed(fatal=true) / unique clients with session_started
target ≥ 0.99 over the soak window
```

Exposed as `dashboard.crashFree` on `GET /api/analytics/dashboard`. Native crashes that kill JS before analytics may appear only in GlitchTip — log them in the soak table as a backstop.

```bash
cd apps/mobile
# DSN is public-by-design in the client bundle (Sensitive, not Secret)
pnpm exec eas env:create --environment staging --name EXPO_PUBLIC_ERROR_DSN --value "$GLITCHTIP_DSN" --visibility sensitive
pnpm --filter mobile build:staging:android
```

| Variable | Where it is read | Why |
|----------|------------------|-----|
| `EXPO_PUBLIC_ERROR_DSN` | `error-reporting.ts` | GlitchTip envelope DSN (preferred) |
| `EXPO_PUBLIC_SENTRY_DSN` | same | Legacy alias; same DSN, still not sentry.io |
| `SENTRY_URL` + `SENTRY_ORG` + `SENTRY_PROJECT` | `app.config.js` plugin | Optional maps upload **only** if `SENTRY_URL` is the GlitchTip origin |

Do **not** set `SENTRY_AUTH_TOKEN` for sentry.io. Do **not** start the 14-day soak until (1) a test event is visible in GlitchTip and (2) `crashFree.sessionClients ≥ 1` on the analytics dashboard.

## Sign-off checklist

- [x] Automated `rc-gate-check` green locally (2026-07-29)
- [x] Automated RC Gate workflow green on GitHub (latest: `success` 2026-08-17)
- [ ] Maestro nightly green ≥7 consecutive days during soak
- [ ] First-party crash-free ≥99% (analytics `crashFree` + GlitchTip native backstop, 14-day window)
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
