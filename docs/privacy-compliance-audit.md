# Privacy compliance audit (P3.4) — GDPR + 152-ФЗ

Fact-check against code on `main` as of 2026-08-17. This is an engineering inventory, not a legal opinion. Lawyer review is still P3.3 / P3.4 sign-off.

## Data inventory

| Data | Where it lives | Lawful-basis note (engineering) |
|------|----------------|----------------------------------|
| Account login / password hash | Postgres `profile.app_users` | Required for backend auth when `EXPO_PUBLIC_BACKEND_AUTH=true` |
| Allergy profiles | Local SQLite / IndexedDB; dual-write to `profile.profiles` when auth is on | Health data — treat as special category |
| Diary, scan history, SOS, emergency contacts | Local first; server copies in `diary_entries`, `scan_history`, `profile_sos`, `emergency_contacts` when dual-write is on | Health data |
| Cloud backup blob | `profile.sync_backups.payload` | Opaque AES-GCM envelope (`encrypted=true`). Server is zero-knowledge |
| Recovery key | Device / user only (12-word phrase) | Not stored on the server |
| Analytics | Optional `EXPO_PUBLIC_ANALYTICS_ENABLED` → console / `POST /api/analytics` | Off by default except EAS `staging` |
| Crash reports | Optional `EXPO_PUBLIC_SENTRY_DSN` | Not set on staging as of this audit |
| Pollen / Places / AQ queries | Server proxies; client sends lat/lon when those flags are on | Location is not persisted in profile tables |

Catalog (`catalog.allergens`, `catalog.products`) is global reference data, not personal data.

## Data-subject requests

### Erasure — `DELETE /api/auth/account`

Implemented in [`apps/api/src/routes/mobile-auth.ts`](../apps/api/src/routes/mobile-auth.ts) → [`deleteAppUser()`](../apps/api/src/services/app-user-service.ts).

Order of operations:

1. Explicit `DELETE` of `sync_backups` for `userId`.
2. `DELETE` of `app_users` for `userId`.

Seven child tables reference `app_users.id` with `onDelete: 'cascade'` in [`app-schema.ts`](../apps/api/src/db/app-schema.ts):

| Table | Cascade |
|-------|---------|
| `profiles` | yes |
| `diary_entries` | yes |
| `scan_history` | yes |
| `emergency_contacts` | yes |
| `profile_sos` | yes |
| `sync_backups` | yes (also deleted explicitly first) |
| `password_reset_tokens` | yes |

Local SQLite / IndexedDB is wiped by the mobile account-deletion flow (profiles + related rows on-device). Offline-only users never create a server row.

### Access / portability — `GET /api/auth/export`

Same route file. Returns `{ user, profiles, exportedAt }` plus a note that diary and scan history live locally or inside the encrypted backup. It does **not** decrypt `sync_backups.payload` (by design — the server cannot).

Gap: a user who wants a full diary/scan export must use the in-app local export / PDF report, or restore the backup on a device that holds the recovery key.

## Residual risks

| Risk | Status |
|------|--------|
| Recovery key loss = backup unrecoverable | Accepted zero-knowledge trade-off. Escrow would need a separate ADR and is out of RC scope. |
| Encrypted blob is deleted with the user | Intended. There is no tombstone / grace period. |
| Export omits diary/scans stored only on device | Document in the privacy policy (P3.3). |
| Staging analytics is on (`eas.json` staging) | Do not copy that default to production without a consent story. |
| Replit host | Paused (HTTP 404 on 2026-08-17). Confirm no leftover Replit Postgres with user rows. |

## Store / 152-ФЗ checklist (still open)

- [ ] Lawyer-approved privacy policy in all 6 locales (drafts: #260)
- [ ] In-app path to export and delete matches the published policy
- [ ] Retention period for server logs / Sentry stated
- [ ] Operator named (Aclearo) and contact `support@aclearo.com` confirmed
- [ ] Production backups of Managed PG covered by the same deletion SLA (see [production-yc-plan.md](./production-yc-plan.md))
