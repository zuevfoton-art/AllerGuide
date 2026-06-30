# Phase 1 — первые шаги (run log)

Отслеживание старта Phase 1. Детальный план: [`phase1-phase2-issues.md`](./phase1-phase2-issues.md).

---

## Выполнено в репозитории

| ID | Артефакт | Статус |
|----|----------|--------|
| **P1.2a** | [`docs/adr/001-dual-write.md`](./adr/001-dual-write.md) | Done |
| **P1.1a** (docs) | [`docs/staging-deploy.md`](./staging-deploy.md), [`apps/api/.env.staging.example`](../apps/api/.env.staging.example), `scripts/staging-*.sh` | Done |
| **P1.1e** (CI skeleton) | [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) | Done (нужны GitHub Secrets) |
| **P1.3a** | [`backup-crypto.ts`](../apps/mobile/src/services/backup-crypto.ts) recovery key API + tests | Done |
| **P1.2b** | [`eas.json`](../apps/mobile/eas.json) profile `staging`, [`eas-staging-build.md`](./eas-staging-build.md) | Done |
| Health | [`apps/api/src/lib/health.ts`](../apps/api/src/lib/health.ts) — DB ping для staging smoke | Done |

---

## Ручные шаги (инфраструктура)

### P1.1a — Neon staging

1. Создать проект `allerguide-staging` в Neon
2. Добавить secrets в GitHub / хостинг (см. [`staging-deploy.md`](./staging-deploy.md))
3. `./scripts/staging-migrate.sh`

### P1.1b–c — Deploy + DNS

1. Deploy API на Railway/Render/Fly
2. DNS `api.staging.allerguide.app`
3. `./scripts/staging-smoke.sh`

### Далее по критическому пути

| После | Задача |
|-------|--------|
| P1.1c | ~~**P1.2b** EAS profile `staging`~~ → [`eas-staging-build.md`](./eas-staging-build.md) |
| P1.2b | **P1.2c** auth smoke на staging build |
| P1.2c | **P1.3b** recovery key UX |
| P1.3a + P1.4a | **P1.4b** encrypted sync E2E |

---

## GitHub Secrets (staging)

| Secret | Обязателен для |
|--------|----------------|
| `STAGING_DATABASE_URL` | migrate workflow |
| `STAGING_DIRECT_DATABASE_URL` | migrate workflow |
| `STAGING_JWT_SECRET` | API hosting env |
| `STAGING_API_URL` | smoke workflow |
