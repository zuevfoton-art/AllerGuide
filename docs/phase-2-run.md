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

**Далее:** P2.5 OWASP mobile audit, P2.6 API pen-test.

См. [roadmap Phase 2](roadmap-to-prod.md#phase-2--quality--security--release-candidate) · [подзадачи](phase1-phase2-issues.md#phase-2--quality--security).

## Sentry (P2.3)

1. Создать проект в Sentry (React Native).
2. EAS secrets: `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
3. Staging/production build с plugin загрузит source maps при наличии org/project.
4. Проверка: тестовый crash через dev menu / `captureError` виден в dashboard.

## Analytics (P2.4b)

1. Staging build: `EXPO_PUBLIC_ANALYTICS_ENABLED=true` (см. `eas.json` profile `staging`).
2. API: `ANALYTICS_DASHBOARD_ENABLED=true` на staging; опционально `POSTHOG_API_KEY`.
3. Проверка: открыть экран → `GET /api/analytics/dashboard?days=1` показывает `screen_view`.
4. Подробнее: [`analytics-staging.md`](./analytics-staging.md).
