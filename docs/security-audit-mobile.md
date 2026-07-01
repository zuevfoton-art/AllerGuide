# Mobile security audit (P2.5)

Audit date: 2026-06-20 · OWASP Mobile Top 10 (2024) checklist for `apps/mobile`.

## Summary

| Severity | Open | Fixed this sprint | Accepted / deferred |
|----------|------|-------------------|---------------------|
| Critical | 0 | 2 | 0 |
| High | 0 | 3 | 2 |
| Medium | 0 | 2 | 4 |
| Low | 0 | 0 | 3 |

**Gate:** 0 critical open · JWT/recovery key not logged · tokens in SecureStore on native.

## OWASP Mobile Top 10 checklist

| # | Risk | Status | Notes |
|---|------|--------|-------|
| M1 | Improper credential usage | **Fixed** | JWT + recovery key moved to SecureStore on native (`secure-settings-service.ts`); legacy SQLite copies migrated and cleared |
| M2 | Inadequate supply chain security | **Accepted** | Expo/EAS dependency pinning in `eas.json`; SBOM not in scope for RC |
| M3 | Insecure authentication/authorization | **OK** | Backend JWT via Bearer; local auth uses `@noble/hashes`; session restore offline-first |
| M4 | Insufficient input/output validation | **OK** | Core validators for auth/profile; analytics PII denylist in `@allerguide/core` |
| M5 | Insecure communication | **Deferred** | HTTPS only in staging/prod EAS profiles; no certificate pinning (documented) |
| M6 | Inadequate privacy controls | **Fixed** | Analytics `console.info` gated to `__DEV__`; Sentry `beforeSend` scrubs token/password fields |
| M7 | Insufficient binary protections | **Deferred** | Standard Expo release builds; no RASP/obfuscation for RC |
| M8 | Security misconfiguration | **Fixed** | Android `allowBackup=false`; ATS enforced on iOS |
| M9 | Insecure data storage | **Fixed** | Sensitive keys in SecureStore; SQLite no longer mirrors JWT/recovery key |
| M10 | Insufficient cryptography | **Partial** | AES-GCM backups when Web Crypto available; local file export remains user-managed JSON (**deferred**) |

## Findings

### Fixed

| ID | Finding | Fix |
|----|---------|-----|
| MOB-01 | Recovery key / `backupSecret` in plaintext SQLite | `secure-settings-service.ts` + migration in `hydrateSensitiveSettings()` |
| MOB-02 | JWT duplicated in SQLite `app_settings` | `backend-api.ts` writes SecureStore only on native |
| MOB-03 | Analytics payloads logged in production builds | `analytics-service.ts` logs only in `__DEV__` |
| MOB-04 | Sentry `extra` could carry secrets | `error-reporting.ts` scrubs sensitive keys + `beforeSend` |
| MOB-05 | Android full backup may include SQLite PHI | `allowBackup=false` in `app.json` + `AndroidManifest.xml` |
| MOB-06 | Password-reset token in deep link URL | `forgot-password.tsx` uses router params; API omits token unless `PASSWORD_RESET_TOKEN_IN_RESPONSE=true` |

### Accepted / deferred

| ID | Finding | Rationale |
|----|---------|-----------|
| MOB-D01 | No certificate pinning | Standard TLS + public CA; pinning deferred to post-RC ops |
| MOB-D02 | SQLite DB unencrypted (diary, allergies) | SQLCipher out of scope; mitigated by OS sandbox + no backup |
| MOB-D03 | Local JSON backup export unencrypted | User-initiated export; documented in UX disclaimer |
| MOB-D04 | Staging Maestro recovery key in EAS env | Internal E2E fixture only; not in production profile |
| MOB-D05 | Cloud sync plaintext fallback if `crypto.subtle` missing | Blocked in practice on current Expo builds; monitor in P2.7 |
| MOB-D06 | Cached `authUserJson` (login email) in SQLite | Needed for offline session; not synced to cloud |

## Verification

```bash
pnpm --filter mobile test
pnpm --filter mobile lint
```

Key tests: `secure-settings-service.test.ts`, `error-reporting.test.ts`, `auth-service.test.ts`, `backup-crypto.test.ts`.

## Related

- [security-audit-api.md](./security-audit-api.md) — API pen-test (P2.6)
- [phase-2-run.md](./phase-2-run.md) — Phase 2 status
