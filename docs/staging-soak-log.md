# Staging soak log (P2.8)

**RC build:** `staging` EAS profile · **Target:** 14 calendar days · **Crash-free goal:** ≥99%

| Field | Value |
|-------|-------|
**Soak start:** _YYYY-MM-DD_  
**Soak end:** _YYYY-MM-DD_
| RC version | _e.g. 1.0.4 (staging)_ |
| RC commit | _git SHA_ |
| Testers | _names / count_ |
| Product owner | _name_ |

## Daily log

| Day | Date | Active testers | Sessions | Crashes (Sentry) | Crash-free % | Maestro nightly | Notes |
|-----|------|----------------|----------|------------------|--------------|---------------|-------|
| 1 | | | | | | ☐ green | |
| 2 | | | | | | ☐ green | |
| 3 | | | | | | ☐ green | |
| 4 | | | | | | ☐ green | |
| 5 | | | | | | ☐ green | |
| 6 | | | | | | ☐ green | |
| 7 | | | | | | ☐ green | **Week 1 review** |
| 8 | | | | | | ☐ green | |
| 9 | | | | | | ☐ green | |
| 10 | | | | | | ☐ green | |
| 11 | | | | | | ☐ green | |
| 12 | | | | | | ☐ green | |
| 13 | | | | | | ☐ green | |
| 14 | | | | | | ☐ green | **Soak complete** |

### How to fill metrics

**Sentry (staging project)**

1. Open Sentry → Project → Releases → select RC release.
2. Note **Crash-free sessions %** for the rolling 24h / 14d window.
3. Gate: **≥99%** average over soak period.

**Maestro nightly**

1. GitHub → Actions → [Maestro Nightly](../.github/workflows/maestro-nightly.yml).
2. Mark ☐ green when both `maestro-offline` and `maestro-staging` jobs succeed.

**Sessions / testers**

- Optional: analytics dashboard `screen_view` unique `client_id` per day (staging API).
- Or manual headcount from tester channel.

## Issues found during soak

| ID | Severity | Summary | Status | Fix commit |
|----|----------|---------|--------|------------|
| | | | open / fixed / deferred | |

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| QA | | | ☐ |
| Mobile lead | | | ☐ |
| Product | | | ☐ |

**Phase 2 milestone:** ☐ Closed → Phase 3 kickoff authorized

See [rc-gate.md](./rc-gate.md) · [phase-3-readiness.md](./phase-3-readiness.md).
