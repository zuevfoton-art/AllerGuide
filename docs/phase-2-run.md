# Phase 2 — run log

| ID | Статус | Артефакт |
|----|--------|----------|
| P2.1a | Done | `apps/mobile/.maestro/flows/*.yaml`, [`maestro.md`](./maestro.md), `testID` hooks |
| P2.1b | Done | `staging-*-smoke.yaml`, fixture `EXPO_PUBLIC_MAESTRO_TEST_RECOVERY_KEY`, `maestro:staging*` scripts |
| P2.1c | Done | [`.github/workflows/maestro-nightly.yml`](../.github/workflows/maestro-nightly.yml), `scripts/maestro-build-apk.sh` |
| P2.2a | Done | `auth-service.test.ts` (4 теста) |
| P2.2b | Done | `profile-service.test.ts` (2 теста) |
| P2.2c | Done | `diary-service.test.ts`, `sync-service-local.test.ts` |
| P2.2d | Done | `scripts/mobile-test-gate.mjs` (≥30), шаг в [CI](../.github/workflows/ci.yml) |
| P2.3a | Done | `error-reporting.ts` + `EXPO_PUBLIC_SENTRY_DSN`, `app.config.js` plugin hook |
| P2.3b | Done | `@sentry/react-native/expo` при `SENTRY_ORG`/`SENTRY_PROJECT`, EAS env в `eas.json` |
| P2.4a | Done | `packages/core/src/analytics-events.ts` (schema, no PII), `analytics-service.test.ts` |
| P2.4b | Done | API ingest + dashboard, mobile wiring, [`analytics-staging.md`](./analytics-staging.md) |
| P2.5a | Done | OWASP mobile audit, [`security-audit-mobile.md`](./security-audit-mobile.md) |
| P2.6a | Done | Pen-test JWT/IDOR/rate-limit, [`security-audit-api.md`](./security-audit-api.md) |
| P2.6b | Done | 0 critical open; fixes + regression tests |
| P2.7a | Done | `startup-metrics.ts`, deferred allergen warm, [`performance-cold-start.md`](./performance-cold-start.md) |
| P2.7b | Done | Redis rate-limit, health DB/redis, [`performance-api-infra.md`](./performance-api-infra.md) |
| P2.7c | Done | `web-store.test.ts`, idle flush, [`performance-web-store.md`](./performance-web-store.md) |

**Далее:** P2.8 RC gate + 2-week soak ([`rc-gate.md`](./rc-gate.md) — PR #105).

См. [roadmap Phase 2](roadmap-to-prod.md#phase-2--quality--security--release-candidate) · [подзадачи](phase1-phase2-issues.md#phase-2--quality--security).

## Performance (P2.7)

1. Cold start: см. [`performance-cold-start.md`](./performance-cold-start.md) — `[startup-metrics]` в logcat, target p95 &lt;3s.
2. API: `REDIS_URL` для shared rate-limit; health → `database` + `rateLimit`.
3. Web: IndexedDB smoke в [qa-checklist](./qa-checklist.md) §14.

## Sentry (P2.3)

1. Создать проект в Sentry (React Native).
2. EAS secrets: `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
3. Staging/production build с plugin загрузит source maps при наличии org/project.
4. Проверка: тестовый crash через dev menu / `captureError` виден в dashboard.

## Analytics (P2.4b)

1. Staging build: `EXPO_PUBLIC_ANALYTICS_ENABLED=true` (см. `eas.json` profile `staging`).
2. API: `ANALYTICS_DASHBOARD_ENABLED=true`, `ANALYTICS_DASHBOARD_KEY` на staging; опционально `POSTHOG_API_KEY`.
3. Проверка: `GET /api/analytics/dashboard?days=1` с заголовком `x-analytics-dashboard-key`.
4. Подробнее: [`analytics-staging.md`](./analytics-staging.md).

## Security audits (P2.5 / P2.6)

1. Mobile: [`security-audit-mobile.md`](./security-audit-mobile.md) — OWASP checklist, SecureStore for secrets.
2. API: [`security-audit-api.md`](./security-audit-api.md) — JWT/IDOR/rate-limit pen-test, 0 critical gate.
3. Staging API: set `ANALYTICS_DASHBOARD_KEY`, do **not** set `PASSWORD_RESET_TOKEN_IN_RESPONSE` in production.
