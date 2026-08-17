# Staging soak log (P2.8)

**Status: BLOCKED** — Phase 2 milestone **not** closed · Phase 3 kickoff **not** authorized

Do not remove the `**Status: BLOCKED**` line until product/QA sign-off. `scripts/rc-gate-check.mjs` treats that exact marker as “manual G3/G5/G7 not done”.

**RC build:** `staging` EAS profile · **Target:** 14 calendar days · **Crash-free goal:** ≥99%

| Field | Value |
|-------|-------|
| Next window start | TBD — after Maestro nightly is enabled and green, and Sentry DSN is on the staging APK |
| Next window end | TBD (start + 13 days) |
| RC version | EAS profile `staging` → `https://api.staging.aclearo.com` |
| RC commit (prepared against) | `e568317` (`main` as of 2026-08-17) |
| Testers | 0 enrolled (closed-beta cohort not signed into this log) |
| Product owner | _pending_ |

## Blockers

Soak cannot be completed or signed off until all items below are cleared:

| # | Blocker | Evidence (updated 2026-08-17) | Owner |
|---|---------|------------------------------|-------|
| B1 | **Maestro nightly — no green soak streak** | Workflow state is `disabled_manually` (no runs after 2026-08-11). Infra fix: [#259](https://github.com/zuevfoton-art/AllerGuide/pull/259) (both jobs on `ubuntu-latest` + KVM, driver timeout 120s, Maestro 2.8.0). After merge: `gh workflow enable maestro-nightly.yml` then `workflow_dispatch`. Need ≥7 green nights. | DevOps / QA |
| B2 | **Sentry crash-free ≥99% unavailable** | `EXPO_PUBLIC_SENTRY_DSN` is not set in EAS `staging`. Pre-soak checklist: [rc-gate.md](./rc-gate.md#pre-soak-sentry-eas-variables-g5) | Mobile / Product |
| B3 | **No active soak testers** | Daily headcount empty; enroll from [closed-beta-p17.md](./closed-beta-p17.md) | Product |
| B4 | ~~GitHub Actions billing~~ (resolved) | CI and RC Gate pass on `main`. Does **not** unlock G3/G5/G7 alone. | Org admin |

**Automated RC gate:**

- Local: `STAGING_API_URL=https://api.staging.aclearo.com pnpm rc-gate` → **PASSED** on 2026-07-29
- GitHub RC Gate → **success** 2026-08-17

Automated G1/G2/G4/G6 do **not** replace manual G3/G5/G7.

## Next 14-day window (prepared, not started)

Fill dates and tick Maestro only after B1–B3 are cleared. Keep **Status: BLOCKED** until sign-off.

| Day | Date | Active testers | Sessions | Crashes (Sentry) | Crash-free % | Maestro nightly | Notes |
|-----|------|----------------|----------|------------------|--------------|-----------------|-------|
| 1 | _YYYY-MM-DD_ | — | — | — | — | ☐ | |
| 2 | | — | — | — | — | ☐ | |
| 3 | | — | — | — | — | ☐ | |
| 4 | | — | — | — | — | ☐ | |
| 5 | | — | — | — | — | ☐ | |
| 6 | | — | — | — | — | ☐ | |
| 7 | | — | — | — | — | ☐ | Week 1 |
| 8 | | — | — | — | — | ☐ | |
| 9 | | — | — | — | — | ☐ | |
| 10 | | — | — | — | — | ☐ | |
| 11 | | — | — | — | — | ☐ | |
| 12 | | — | — | — | — | ☐ | |
| 13 | | — | — | — | — | ☐ | |
| 14 | | — | — | — | — | ☐ | Sign-off candidate |

### How to start the window

1. Merge [#259](https://github.com/zuevfoton-art/AllerGuide/pull/259), enable Maestro Nightly, get both jobs green on `workflow_dispatch`.
2. Set the four Sentry EAS variables ([rc-gate.md](./rc-gate.md#pre-soak-sentry-eas-variables-g5)) and rebuild `staging`.
3. Confirm a test event in the Sentry staging project.
4. Enroll testers from [closed-beta-p17.md](./closed-beta-p17.md) and name a product owner.
5. Replace `_YYYY-MM-DD_` with the real start date. **Leave `Status: BLOCKED` until the 14th day is signed.**

## Previous attempt (2026-07-04 … 2026-07-29) — not signed

| Field | Value |
|-------|-------|
| Soak start | 2026-07-04 |
| Soak end | BLOCKED 2026-07-29 |
| RC commit (at block) | `083f99f` |
| Outcome | No metrics. Maestro failed every night; Sentry DSN missing; 0 testers. |

## Issues found during soak

| ID | Severity | Summary | Status | Fix commit |
|----|----------|---------|--------|------------|
| SOAK-B1 | Blocker | Maestro nightly disabled / emulator+driver startup | open — fix in #259 | — |
| SOAK-B2 | Blocker | `EXPO_PUBLIC_SENTRY_DSN` missing on EAS `staging` | open | — |
| SOAK-B3 | Blocker | No enrolled soak testers | open | — |
| SOAK-B4 | Resolved | GitHub Actions billing blocked runners mid-window | resolved | — |

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| QA | — | — | ☐ **BLOCKED** |
| Mobile lead | — | — | ☐ **BLOCKED** |
| Product | — | — | ☐ **BLOCKED** |

**Phase 2 milestone:** ☐ Closed · **BLOCKED** → Phase 3 kickoff **not** authorized

See [rc-gate.md](./rc-gate.md) · [phase-3-readiness.md](./phase-3-readiness.md) · [phase-2-run.md](./phase-2-run.md).
