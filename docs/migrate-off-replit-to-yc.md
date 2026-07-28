# Миграция stage: Replit → Yandex Cloud

**Цель:** единственный staging backend — Yandex Cloud (`api.staging.aclearo.com` / `.ru`).  
Replit (`aller-guide.replit.app`) — legacy до фаз 3–5; stage-клиенты на него не опираются.

**Каноничный deploy runbook:** [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) · console: [`staging-yandex-cloud-console.md`](./staging-yandex-cloud-console.md)  
**EAS mobile:** [`eas-staging-build.md`](./eas-staging-build.md) · profile `staging` в `apps/mobile/eas.json`

---

## Фазы

| Фаза | Суть | Артефакт |
|------|------|----------|
| **0** | Зафиксировать критерий «Replit не нужен для stage» | Этот документ §Phase 0 + `scripts/yc-stage-phase0-gate.sh` |
| 1 | Lockbox / pollen / полный env на YC API | [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) §3 |
| 2 | Клиенты только на YC URL | EAS `staging`, web stage origins |
| 3 | Вырезать Replit из репо (profile, docs, OIDC) | PR cleanup |
| 4 | Данные/секреты только Lockbox + ротация | Ops |
| 5 | Приёмка: Replit paused, gate + preflight зелёные | Closed beta |

---

## Phase 0 — критерий готовности (без Replit)

Stage считается **готовым к отказу от Replit**, когда все пункты ниже выполнены.  
Автопроверка: `./scripts/yc-stage-phase0-gate.sh` (или `pnpm yc-stage-phase0`).

### P0 критерии

| ID | Проверка | Ожидание |
|----|----------|----------|
| **P0.1** | `GET https://api.staging.aclearo.com/api/health` | HTTP 200, `ok: true`, `authDatabase: true`, `database.ok: true` |
| **P0.2** | Зеркало RU (рекомендуется) | То же на `https://api.staging.aclearo.ru/api/health` |
| **P0.3** | Feature flags на API | `features.sync: true`, `features.aiScan: true` |
| **P0.4** | Pollen heatmap (если EAS `staging` → `EXPO_PUBLIC_POLLEN_HEATMAP=google`) | `features.pollenHeatmap: true` + Lockbox `POLLEN_HEATMAP_ENABLED` / `GOOGLE_POLLEN_API_KEY` |
| **P0.5** | EAS profile **`staging`** | `EXPO_PUBLIC_API_URL` = `https://api.staging.aclearo.com` (не `*.replit.app`) |
| **P0.6** | Stage automation | `scripts/staging-*.sh` defaults и staging workflows **не** указывают на `*.replit.app` |
| **P0.7** | API smokes (опционально в gate) | `STAGING_RUN_SMOKES=1` → `staging-preflight.sh` |

### Что Phase 0 **не** требует

- Удаления EAS profile `replit` / `.replit` / Replit OIDC (это **фаза 3**).
- Pause/Unpublish Replit deployment (**фаза 5**).
- Offline-only profile `preview` — остаётся без backend.

### Запуск gate

```bash
# Обязательные live + static checks
./scripts/yc-stage-phase0-gate.sh

# + auth/sync/scan preflight
STAGING_RUN_SMOKES=1 ./scripts/yc-stage-phase0-gate.sh

# Пропустить RU-зеркало (если DNS ещё не готов)
SKIP_RU_MIRROR=1 ./scripts/yc-stage-phase0-gate.sh

# Временно не требовать pollenHeatmap (только пока Lockbox не заполнен)
ALLOW_MISSING_POLLEN_HEATMAP=1 ./scripts/yc-stage-phase0-gate.sh
```

Exit code `0` = Phase 0 критерии выполнены; иначе — список failed checks в stderr.

### Текущий снимок Phase 0 gate

Прогон `./scripts/yc-stage-phase0-gate.sh` против YC:

| ID | Статус | Комментарий |
|----|--------|-------------|
| P0.1 / P0.2 | ✅ | `api.staging.aclearo.com` и `.ru` — `ok`, DB, auth |
| P0.3 | ✅ | `sync` + `aiScan` (Yandex provider) |
| P0.4 | ✅ | `features.pollenHeatmap: true` (Lockbox + image `phase1-418801c`) |
| P0.5 | ✅ | EAS `staging` → `https://api.staging.aclearo.com` |
| P0.6 | ✅ | staging scripts/workflows без `replit.app` |
| — | ⚠️ | EAS profile `replit` ещё в репо → **фаза 3** |

Пока pollen не в Lockbox: `ALLOW_MISSING_POLLEN_HEATMAP=1 pnpm yc-stage-phase0` (временный обход для остальных checks).

### Связь с P1.7 preflight

`staging-preflight.sh` — функциональные smokes перед closed beta.  
Phase 0 gate — **инфраструктурный** критерий «YC = единственный stage URL».  
Оба должны быть зелёными перед раздачей EAS `staging` как «официального» stage.

---

## Статус «что уже поднято на YC» (inventory)

Проверено **2026-07-28** из CI/agent VM: live HTTP/DNS/TLS + auth smoke.  
`terraform output` / `yc` CLI в этой среде **недоступны** (нет local state и `yc` binary) — IDs ресурсов сверяйте локально:

```bash
cd infra/yandex/staging
terraform output
# sensitive:
terraform output -raw database_url   # не печатать в чат/PR
terraform output lockbox_secret_id container_registry_id serverless_container_id api_gateway_id
```

### A. Edge / DNS / TLS

| Компонент | Статус | Доказательство |
|-----------|--------|----------------|
| `api.staging.aclearo.com` | ✅ live | CNAME → `*.apigw.yandexcloud.net`, `GET /api/health` 200 |
| `api.staging.aclearo.ru` | ✅ live | Тот же GW IP / health 200 |
| TLS | ✅ | LE cert `CN=api.staging.aclearo.com` (valid ~Jul–Oct 2026) |
| Helmet / rate limit | ✅ | HSTS + `ratelimit-*` headers на health |

### B. API runtime (Serverless behind GW)

| Компонент | Статус | Доказательство |
|-----------|--------|----------------|
| Process / routing | ✅ | JSON health, не Replit HTML |
| Postgres connectivity | ✅ | `database.ok: true`, latency ~50 ms, `pooler: false` |
| JWT auth | ✅ | `authDatabase: true`; `staging-auth-smoke.sh` register/login/me **Pass** |
| Cloud sync flag | ✅ | `features.sync: true` |
| AI scan | ✅ | `features.aiScan: true`, `aiScanProvider: "yandex"`, dailyBudget 100 |
| YC OCR | ✅ | `features.ycOcr: true` |
| Google pollen heatmap | ✅ (2026-07-28) | `features.pollenHeatmap: true`; tile HTTP 200 PNG; image `aclearo-api:phase1-418801c` |
| Replit (legacy) | ⚠️ still up | `aller-guide.replit.app/api/health` → урезанный `{ok, authDatabase}` без YC features |

### C. Инфра Terraform (ожидаемые ресурсы)

Код: [`infra/yandex/staging/`](../infra/yandex/staging/). По live API **косвенно** видно, что VPC+PG+Container+GW+TLS уже работали (health+DB+JWT). Прямой `terraform output` здесь не снят — чеклист для владельца folder:

| Ресурс (output) | Нужен для | Локально проверить |
|-----------------|-----------|--------------------|
| `network_id` / `subnet_id` | VPC | `terraform output` |
| `postgresql_fqdn` / `database_url` | private PG | только VPC / Lockbox |
| `container_registry_id` | YCR images | + GitHub `YC_REGISTRY_ID` |
| `serverless_container_id` | API runtime | + GitHub `YC_CONTAINER_ID` |
| `lockbox_secret_id` | env API | pollen keys ещё не отражены в health |
| `api_gateway_id` / `api_gateway_default_domain` | публичный HTTPS | DNS уже указывает на apigw |
| `certificate_id` | TLS custom domains | cert ISSUED (см. openssl) |
| `github_runner_public_ip` | migrate job | self-hosted `yc-staging-vpc` |
| `deploy_service_account_key` | CI push/deploy | GitHub `YC_SA_JSON` |

### D. CI / automation

| Item | Статус | Комментарий |
|------|--------|-------------|
| Workflow `deploy-staging-yandex.yml` | ⚠️ active, recent runs **fail** | Gate: нужны `YC_SA_JSON`, `YC_REGISTRY_ID`, `YC_CONTAINER_ID` (0s failure = secrets missing/incomplete на событии) |
| Trigger | push `staging` / `workflow_dispatch` | Не каждый PR |
| EAS profile `staging` | ✅ в репо | URL = YC |
| EAS profile `replit` | ⚠️ legacy | Убрать в фазе 3 |
| Phase 0 gate script | ✅ | `pnpm yc-stage-phase0` |

### E. Сводный чеклист (PR / ops)

- [x] DNS + TLS `api.staging.aclearo.com` / `.ru` на API Gateway
- [x] Health 200, `database.ok`, `authDatabase`
- [x] `features.sync` + `features.aiScan` (+ Yandex AI / `ycOcr`)
- [x] Auth smoke (`./scripts/staging-auth-smoke.sh`)
- [x] EAS `staging` → YC URL (не Replit)
- [x] Stage scripts/workflows без `replit.app`
- [x] Lockbox: `POLLEN_HEATMAP_ENABLED=true` + `GOOGLE_POLLEN_API_KEY` → `features.pollenHeatmap: true`
- [x] Pollen tile HTTP 200 PNG **или** JSON 404 от proxy (не HTML) — `./scripts/staging-pollen-smoke.sh`
- [x] Image с `registerPollenRoutes` задеплоен (`BUILD_PUSH=1` / branch `staging`)
- [x] `pnpm yc-stage-phase0` без `ALLOW_MISSING_POLLEN_HEATMAP`
- [ ] GitHub Secrets `YC_*` + `YC_LOCKBOX_SECRET_ID` полные → зелёный `deploy-staging-yandex`
- [ ] Self-hosted runner `yc-staging-vpc` Idle (migrate)
- [ ] `STAGING_RUN_SMOKES=1` preflight (sync + scan)
- [ ] EAS Sensitive `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` + staging APK QA
- [ ] Pause Replit deployment (фаза 5)
- [ ] Удалить EAS `replit` / docs hooks (фаза 3)

**Вывод:** YC stage **уже несёт** API + DB + auth + sync + Yandex AI/OCR. Для закрытия Phase 0 без оговорок остаётся **pollen Lockbox (фаза 1)**; CI deploy secrets и Replit cleanup — следующие фазы.

---

## Фазы 1–5

### 1 — YC API env: Lockbox pollen + полный mount + redeploy

**Цель:** `features.pollenHeatmap: true` на `api.staging.aclearo.com` и живой proxy `/api/pollen/heatmap/...`.

Live (до Phase 1 apply): tile отдаёт **HTML 404** — на revision нет pollen routes и/или нет Lockbox keys. Нужны **оба**: свежий image (`apps/api` с `registerPollenRoutes`) **и** env.

#### 1.1 Lockbox keys

Список mount: [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys).  
Обязательно добавить/обновить:

```text
POLLEN_HEATMAP_ENABLED=true
GOOGLE_POLLEN_API_KEY=<pollen server key>
POLLEN_RATE_LIMIT_WINDOW_MS=60000
POLLEN_RATE_LIMIT_MAX=120
```

Не класть pollen key в EAS / `EXPO_PUBLIC_*`.

#### 1.2 Команда (локально с `yc`)

```bash
# yc уже с SA (lockbox + serverless containers)
export GOOGLE_POLLEN_API_KEY='…'          # только Pollen API
export YC_LOCKBOX_SECRET_ID=e6qs399v1b3unstfh5rj   # или terraform output
export YC_CONTAINER_ID=…                 # terraform / console
export YC_REGISTRY_ID=…

# Upsert Lockbox + build/push image + deploy + smoke
BUILD_PUSH=1 pnpm yc-stage-phase1
# = ./scripts/yc-stage-phase1-enable-pollen.sh
```

Только Lockbox (без deploy): `SKIP_DEPLOY=1 pnpm yc-stage-phase1`

Проверка:

```bash
./scripts/staging-pollen-smoke.sh
pnpm yc-stage-phase0   # P0.4 должен стать PASS
```

#### 1.3 CI

[`.github/workflows/deploy-staging-yandex.yml`](../.github/workflows/deploy-staging-yandex.yml):

- Deploy монтирует **все присутствующие** ключи из `lockbox-staging.keys` (не только JWT/DB).
- Smoke вызывает `staging-pollen-smoke.sh` после preflight.
- Нужны GitHub Secrets: `YC_SA_JSON`, `YC_REGISTRY_ID`, `YC_CONTAINER_ID`, `YC_LOCKBOX_SECRET_ID`, `STAGING_API_URL`.

#### 1.4 Чеклист Phase 1

- [ ] `GOOGLE_POLLEN_API_KEY` в Lockbox (не в git/EAS)
- [ ] `POLLEN_HEATMAP_ENABLED=true` в Lockbox
- [ ] Image с pollen routes задеплоен (`BUILD_PUSH=1` или push в `staging`)
- [ ] Revision монтирует pollen keys (`yc-lockbox-deploy-secrets.sh`)
- [ ] `curl …/api/health | jq .features.pollenHeatmap` → `true`
- [ ] `./scripts/staging-pollen-smoke.sh` Pass
- [ ] `pnpm yc-stage-phase0` без `ALLOW_MISSING_POLLEN_HEATMAP`

### 2 — Клиенты

- Билды: только `eas build --profile staging` (не `replit`).
- EAS Sensitive: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Web stage (если есть): API = YC; GCP JS referrers без опоры на `*.replit.app`.

### 3 — Cleanup репо

Удалить/архивировать: EAS `replit`, `build:replit:*`, `.replit`, `scripts/replit-*`, устаревшие ссылки в docs; решить судьбу Replit OIDC в `apps/api`.

### 4 — Данные и секреты

Чистый Managed PG или одноразовый import; секреты только Lockbox + GitHub Actions; ротация ключей, светившихся вне Lockbox.

### 5 — Приёмка

Phase 0 gate + preflight зелёные; Replit deployment paused; в stage-flow нет `replit.app`.

---

## Связанные артефакты

| Путь | Роль |
|------|------|
| [`scripts/yc-stage-phase0-gate.sh`](../scripts/yc-stage-phase0-gate.sh) | Автоgate Phase 0 |
| [`scripts/yc-stage-phase1-enable-pollen.sh`](../scripts/yc-stage-phase1-enable-pollen.sh) | Phase 1 Lockbox pollen + deploy |
| [`scripts/yc-lockbox-upsert.sh`](../scripts/yc-lockbox-upsert.sh) | Merge keys → Lockbox version |
| [`scripts/yc-lockbox-deploy-secrets.sh`](../scripts/yc-lockbox-deploy-secrets.sh) | Mount `lockbox-staging.keys` |
| [`scripts/staging-pollen-smoke.sh`](../scripts/staging-pollen-smoke.sh) | Health + tile smoke |
| [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys) | Keys to mount from Lockbox |
| [`scripts/staging-preflight.sh`](../scripts/staging-preflight.sh) | P1.7 smokes |
| [`docs/staging-yandex-cloud.md`](./staging-yandex-cloud.md) | Deploy YC |
| [`docs/gcp-pollen-maps-keys.md`](./gcp-pollen-maps-keys.md) | GCP + Lockbox pollen |
| [`apps/mobile/eas.json`](../apps/mobile/eas.json) | Profile `staging` |
