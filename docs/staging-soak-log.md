# Staging soak log (P2.8)

**Status: BLOCKED** — Phase 2 milestone **not** closed · Phase 3 kickoff **not** authorized

**RC build:** `staging` EAS profile · **Target:** 14 calendar days · **Crash-free goal:** ≥99%

| Field | Value |
|-------|-------|
| Soak start (planned) | 2026-07-04 |
| Soak end | **BLOCKED** 2026-07-29 |
| RC version | EAS profile `staging` → `https://api.staging.aclearo.com` |
| RC commit (at block) | `083f99f` (`main`) |
| Testers | 0 enrolled (closed-beta cohort not signed into this log) |
| Product owner | _pending_ |

## Blockers

Soak cannot be completed or signed off until all items below are cleared:

| # | Blocker | Evidence (updated 2026-08-17) | Owner |
|---|---------|------------------------------|-------|
| B1 | **Maestro nightly — no green soak streak** | 10 consecutive `failure` runs through 2026-08-11, no runs since. Cause is no longer billing — runners start and the failures are infra-level: `maestro-offline` on `macos-latest` dies with `Timeout waiting for emulator to boot` (runner is arm64, workflow asks for `arch: x86_64`); `maestro-staging` on ubuntu boots the emulator but fails with `AndroidDriverTimeoutException: Maestro Android driver did not start up in time`. No app assertion has been reached. Need ≥7 green nights after the workflow is fixed. | DevOps / QA |
| B2 | **Sentry crash-free ≥99% unavailable** | Root cause identified: `EXPO_PUBLIC_SENTRY_DSN` is not set in the EAS `staging` profile, so no crash-free data exists to close G5 | Mobile / Product |
| B3 | **No active soak testers** | Daily headcount empty; P1.7 closed-beta gate-out not reflected here | Product |
| B4 | ~~GitHub Actions billing~~ (resolved) | Mid-window jobs failed to start (*spending limit*). CI and RC Gate have run and passed on `main` since (RC Gate `success` 2026-08-17). Does **not** unlock G3/G5/G7 alone. | Org admin |

**Automated RC gate:**

- Local: `STAGING_API_URL=https://api.staging.aclearo.com pnpm rc-gate` → **PASSED** on 2026-07-29
- GitHub [RC Gate](https://github.com/zuevfoton-art/AllerGuide/actions/runs/30490654726) (PR) → **success** on 2026-07-29

Automated G1/G2/G4/G6 do **not** replace manual G3/G5/G7.

## Daily log

| Day | Date | Active testers | Sessions | Crashes (Sentry) | Crash-free % | Maestro nightly | Notes |
|-----|------|----------------|----------|------------------|--------------|-----------------|-------|
| 1 | 2026-07-04 | — | — | — | — | ☐ blocked | Planned start; metrics not collected |
| 2 | 2026-07-05 | — | — | — | — | ☐ blocked | |
| 3 | 2026-07-06 | — | — | — | — | ☐ blocked | Last known remote RC Gate **success** (pre-billing outage) |
| 4 | 2026-07-07 | — | — | — | — | ☐ blocked | |
| 5 | 2026-07-08 | — | — | — | — | ☐ blocked | |
| 6 | 2026-07-09 | — | — | — | — | ☐ blocked | |
| 7 | 2026-07-10 | — | — | — | — | ☐ blocked | **Week 1** — no sign-off |
| 8 | 2026-07-11 | — | — | — | — | ☐ blocked | |
| 9 | 2026-07-12 | — | — | — | — | ☐ blocked | |
| 10 | 2026-07-13 | — | — | — | — | ☐ blocked | Remote RC Gate failure (billing) |
| 11 | 2026-07-14 | — | — | — | — | ☐ blocked | |
| 12 | 2026-07-15 | — | — | — | — | ☐ blocked | |
| 13 | 2026-07-16 | — | — | — | — | ☐ blocked | |
| 14 | 2026-07-17 | — | — | — | — | ☐ blocked | Planned day 14 — **not completed** |
| — | 2026-07-20…29 | — | — | — | — | ✗ no green | Maestro Nightly `failure` streak; CI billing mitigated late on 2026-07-29 |

### How to resume after unblock

**Sentry (staging project)**

1. Open Sentry → Project → Releases → select RC release.
2. Note **Crash-free sessions %** for the rolling 24h / 14d window.
3. Gate: **≥99%** average over soak period.

**Maestro nightly**

1. Fix the workflow itself first (emulator arch on the macOS job, Maestro driver startup on the ubuntu job) — see [roadmap-to-prod.md §6 step 1](./roadmap-to-prod.md#шаг-1--починить-maestro-nightly-разблокирует-g3).
2. Trigger [Maestro Nightly](../.github/workflows/maestro-nightly.yml) manually (`workflow_dispatch`) until both jobs pass; also confirm the `schedule` trigger fires again.
3. Mark green when both `maestro-offline` and `maestro-staging` succeed.
4. Restart a fresh 14-day window (update start/end + clear **BLOCKED** status).

**Sessions / testers**

- Optional: analytics dashboard `screen_view` unique `client_id` per day (staging API).
- Or manual headcount from tester channel.

## Issues found during soak

| ID | Severity | Summary | Status | Fix commit |
|----|----------|---------|--------|------------|
| SOAK-B1 | Blocker | Maestro nightly cannot start emulator / Android driver (arm64 runner vs `x86_64`; driver timeout) | open | — |
| SOAK-B2 | Blocker | `EXPO_PUBLIC_SENTRY_DSN` missing on EAS `staging` → no crash-free metric | open | — |
| SOAK-B3 | Blocker | No enrolled soak testers | open | — |
| SOAK-B4 | Resolved | GitHub Actions billing blocked runners mid-window | resolved (CI + RC Gate green since 2026-08) | — |

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| QA | — | 2026-07-29 | ☐ **BLOCKED** |
| Mobile lead | — | 2026-07-29 | ☐ **BLOCKED** |
| Product | — | 2026-07-29 | ☐ **BLOCKED** |

**Phase 2 milestone:** ☐ Closed · **BLOCKED** → Phase 3 kickoff **not** authorized

See [rc-gate.md](./rc-gate.md) · [phase-3-readiness.md](./phase-3-readiness.md) · [phase-2-run.md](./phase-2-run.md).
