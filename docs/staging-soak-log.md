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

| # | Blocker | Evidence (2026-07-29) | Owner |
|---|---------|----------------------|-------|
| B1 | **Maestro nightly — no green soak streak** | Nightly runs 2026-07-20 … 2026-07-29 all `failure` (billing outage prevented runners). 0 consecutive green days in the soak window. Need ≥7 green nights after Actions is stable. | DevOps / QA |
| B2 | **Sentry crash-free ≥99% unavailable** | No staging crash-free % recorded in this log; `EXPO_PUBLIC_SENTRY_DSN` metrics not available to close G5 | Mobile / Product |
| B3 | **No active soak testers** | Daily headcount empty; P1.7 closed-beta gate-out not reflected here | Product |
| B4 | ~~GitHub Actions billing~~ (mitigated) | Mid-window jobs failed to start (*spending limit*). As of 2026-07-29 evening, CI on `main` runs again ([run 30489891864](https://github.com/zuevfoton-art/AllerGuide/actions/runs/30489891864) `success`). Does **not** unlock G3/G5/G7 alone. | Org admin |

**Automated RC gate (local):** `STAGING_API_URL=https://api.staging.aclearo.com pnpm rc-gate` → **PASSED** on 2026-07-29 (typecheck, lint, test, mobile ≥30, Maestro flow artifacts, security audits 0 critical, staging health OK). This does **not** replace G3/G5/G7.

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

1. Confirm GitHub Actions billing remains healthy.
2. GitHub → Actions → [Maestro Nightly](../.github/workflows/maestro-nightly.yml).
3. Mark green when both `maestro-offline` and `maestro-staging` succeed.
4. Restart a fresh 14-day window (update start/end + clear **BLOCKED** status).

**Sessions / testers**

- Optional: analytics dashboard `screen_view` unique `client_id` per day (staging API).
- Or manual headcount from tester channel.

## Issues found during soak

| ID | Severity | Summary | Status | Fix commit |
|----|----------|---------|--------|------------|
| SOAK-B1 | Blocker | No Maestro green streak in soak window | open | — |
| SOAK-B2 | Blocker | Sentry crash-free not recorded | open | — |
| SOAK-B3 | Blocker | No enrolled soak testers | open | — |
| SOAK-B4 | Mitigated | GitHub Actions billing blocked runners mid-window | mitigated (CI green again 2026-07-29) | — |

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| QA | — | 2026-07-29 | ☐ **BLOCKED** |
| Mobile lead | — | 2026-07-29 | ☐ **BLOCKED** |
| Product | — | 2026-07-29 | ☐ **BLOCKED** |

**Phase 2 milestone:** ☐ Closed · **BLOCKED** → Phase 3 kickoff **not** authorized

See [rc-gate.md](./rc-gate.md) · [phase-3-readiness.md](./phase-3-readiness.md) · [phase-2-run.md](./phase-2-run.md).
