# Yandex Cloud staging gates

**Единственный хостинг API — Yandex Cloud.** Stage: `https://api.staging.aclearo.com` (зеркало `.ru`). Другого stage/prod host нет.

Операционный runbook: [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) · console: [`staging-yandex-cloud-console.md`](./staging-yandex-cloud-console.md)  
EAS: [`eas-staging-build.md`](./eas-staging-build.md) · профиль `staging` в `apps/mobile/eas.json`

```bash
pnpm yc-stage-phase0   # live YC health + EAS staging URL
pnpm yc-stage-phase1   # Lockbox pollen + container redeploy
pnpm yc-stage-phase2   # clients → api.staging.aclearo.com
pnpm yc-stage-phase3   # no foreign-host deploy artifacts in repo
pnpm yc-stage-phase4   # secrets hygiene (Lockbox / GH / EAS)
pnpm yc-stage-phase5   # final YC acceptance (re-runs 0/2/3/4 + pollen smoke)
```

---

## Phase 0 — YC live

| ID | Проверка | Ожидание |
|----|----------|----------|
| **P0.1** | `GET https://api.staging.aclearo.com/api/health` | HTTP 200, `ok`, `authDatabase`, `database.ok` |
| **P0.2** | Зеркало RU | То же на `https://api.staging.aclearo.ru/api/health` |
| **P0.3** | Feature flags | `features.sync`, `features.aiScan` |
| **P0.4** | Pollen (если EAS `staging` → `EXPO_PUBLIC_POLLEN_HEATMAP=google`) | `features.pollenHeatmap: true` |
| **P0.5** | EAS `staging` | `EXPO_PUBLIC_API_URL=https://api.staging.aclearo.com` |
| **P0.6** | Stage scripts / workflows | defaults на `api.staging.aclearo.com` |

```bash
./scripts/yc-stage-phase0-gate.sh
STAGING_RUN_SMOKES=1 ./scripts/yc-stage-phase0-gate.sh
SKIP_RU_MIRROR=1 ./scripts/yc-stage-phase0-gate.sh
```

## Phase 1 — Lockbox pollen

`POLLEN_HEATMAP_ENABLED` + `GOOGLE_POLLEN_API_KEY` в Lockbox, затем `pnpm yc-stage-phase1` (нужны `YC_CONTAINER_ID`, `GOOGLE_POLLEN_API_KEY`). См. [`gcp-pollen-maps-keys.md`](./gcp-pollen-maps-keys.md).

## Phase 2 — клиенты только на YC

EAS `staging`, `apps/mobile/.env.staging.example` и staging workflows указывают на `api.staging.aclearo.com`. Нет посторонних host URL в stage-конфигах.

## Phase 3 — гигиена репозитория

В репо нет foreign-host deploy-профилей, OIDC-адаптеров и артефактов. Stage docs описывают только Yandex Cloud.

## Phase 4 — секреты

Канонические хранилища: Lockbox + GitHub Actions + EAS. SoT данных — YC Managed PostgreSQL. См. [`staging-secrets-inventory.md`](./staging-secrets-inventory.md).

## Phase 5 — приёмка YC

`pnpm yc-stage-phase5` заново гоняет гейты 0/2/3/4, live health и pollen smoke. Других host не проверяет.

```bash
pnpm yc-stage-phase5
STAGING_RUN_SMOKES=1 pnpm yc-stage-phase5
```
