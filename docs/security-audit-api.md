# API security audit (P2.6)

Audit date: 2026-06-20 · Pen-test focus: JWT, IDOR, rate limiting.

## Summary

| Severity | Open | Fixed this sprint | Accepted / deferred |
|----------|------|-------------------|---------------------|
| Critical | 0 | 2 | 0 |
| High | 0 | 1 | 1 |
| Medium | 0 | 1 | 3 |
| Low | 0 | 0 | 2 |

**Gate:** 0 critical open · regression tests in `security-pentest.test.ts`, `security.test.ts`, `sync-auth.test.ts`.

## Test matrix

| Check | Expected | Test file |
|-------|----------|-----------|
| Missing `Authorization` | 401 `Unauthorized` | `security-pentest.test.ts` |
| Malformed JWT | 401 `Invalid or expired token` | `security-pentest.test.ts` |
| Expired JWT | 401 | `security-pentest.test.ts` |
| Profile IDOR (user A → profile B) | 404 | `security-pentest.test.ts` |
| Sync IDOR (JWT user ≠ path userId) | 403 | `sync-auth.test.ts`, `sync.integration.test.ts` |
| Sync without auth when enabled | 401 | `security-pentest.test.ts`, `sync-auth.test.ts` |
| Auth brute-force loop | 429 | `security.test.ts` |
| Forgot-password token in body | absent (prod) | `security-pentest.test.ts` |
| Analytics dashboard | 401 without key | `analytics.test.ts` |

## Findings

### Fixed (P2.6b)

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| API-01 | **Critical** | Sync open when `SYNC_ENABLED=true` but no `JWT_SECRET` / `SYNC_API_KEY` | `sync.ts` `requireSyncAccess` now always returns 401 without credentials |
| API-02 | **Critical** | `forgot-password` returned `resetToken` in JSON | Token only when `PASSWORD_RESET_TOKEN_IN_RESPONSE=true` (dev/staging) |
| API-03 | **High** | Analytics dashboard public when enabled | Requires `x-analytics-dashboard-key` matching `ANALYTICS_DASHBOARD_KEY` |

### Accepted / deferred

| ID | Severity | Finding | Rationale |
|----|----------|---------|-----------|
| API-D01 | High | `SYNC_API_KEY` grants cross-user access | Legacy server-to-server; disable in prod, use JWT only |
| API-D02 | Medium | Rate limit store in-memory | P2.7b — Redis / Upstash |
| API-D03 | Medium | `GET /api/alias-feedback` unauthenticated | Internal QA tool; disable or gate in prod deploy |
| API-D04 | Medium | `SCAN_REQUIRE_AUTH` optional | Staging/prod env sets `true` |
| API-D05 | Low | Health exposes feature flags | Acceptable for staging LB probes |
| API-D06 | Low | Password min length 6 on reset | Align with product policy in Phase 3 |

## Route auth reference

| Route | Auth |
|-------|------|
| `GET /api/health` | None |
| `POST /api/auth/register`, `login`, `forgot-password`, `reset-password` | None (rate-limited) |
| `GET /api/auth/me`, `DELETE /api/auth/account` | JWT |
| `/api/profiles/*` | JWT (userId scoped in service layer) |
| `/api/sync/*` | JWT (preferred) or `x-sync-api-key` |
| `POST /api/scan` | JWT when `SCAN_REQUIRE_AUTH=true` |
| `POST /api/analytics/events` | None (PII-sanitized ingest) |
| `GET /api/analytics/dashboard` | `x-analytics-dashboard-key` when enabled |
| `/api/allergens`, `/api/products/*`, `/api/governance` | Public by design |

## Staging verification

```bash
# JWT required
curl -s -o /dev/null -w "%{http_code}" https://api.staging.allerguide.app/api/auth/me
# → 401

# Dashboard (set ANALYTICS_DASHBOARD_KEY on server)
curl -s -H "x-analytics-dashboard-key: $ANALYTICS_DASHBOARD_KEY" \
  "https://api.staging.allerguide.app/api/analytics/dashboard?days=1"

# Rate limit (expect 429 after AUTH_RATE_LIMIT_MAX attempts)
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    https://api.staging.allerguide.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"loginType":"email","login":"probe@example.com","password":"wrong"}'
done
```

## Env vars

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Required for auth + JWT sync |
| `SYNC_API_KEY` | Optional legacy sync key (avoid in prod) |
| `PASSWORD_RESET_TOKEN_IN_RESPONSE` | `true` only in dev/staging (no email provider yet) |
| `ANALYTICS_DASHBOARD_KEY` | Required header secret for dashboard |
| `RATE_LIMIT_DISABLED` | `true` only in tests |
| `SCAN_REQUIRE_AUTH` | `true` on staging/production |

## Related

- [security-audit-mobile.md](./security-audit-mobile.md) — mobile OWASP audit (P2.5)
- [analytics-staging.md](./analytics-staging.md) — analytics dashboard setup
