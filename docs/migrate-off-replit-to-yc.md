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

### Текущий снимок (live)

Прогон `./scripts/yc-stage-phase0-gate.sh` против YC:

| ID | Статус | Комментарий |
|----|--------|-------------|
| P0.1 / P0.2 | ✅ | `api.staging.aclearo.com` и `.ru` — `ok`, DB, auth |
| P0.3 | ✅ | `sync` + `aiScan` (Yandex provider) |
| P0.4 | ❌ | `features.pollenHeatmap` отсутствует → **фаза 1** (Lockbox) |
| P0.5 | ✅ | EAS `staging` → `https://api.staging.aclearo.com` |
| P0.6 | ✅ | staging scripts/workflows без `replit.app` |
| — | ⚠️ | EAS profile `replit` ещё в репо → **фаза 3** |

Пока pollen не в Lockbox: `ALLOW_MISSING_POLLEN_HEATMAP=1 pnpm yc-stage-phase0` (временный обход для остальных checks).

### Связь с P1.7 preflight

`staging-preflight.sh` — функциональные smokes перед closed beta.  
Phase 0 gate — **инфраструктурный** критерий «YC = единственный stage URL».  
Оба должны быть зелёными перед раздачей EAS `staging` как «официального» stage.

---

## Фазы 1–5 (кратко)

### 1 — YC API env

Lockbox: полный список из [`apps/api/.env.staging.example`](../apps/api/.env.staging.example), включая:

```text
POLLEN_HEATMAP_ENABLED=true
GOOGLE_POLLEN_API_KEY=<pollen server key>
```

Не класть pollen key в EAS / `EXPO_PUBLIC_*`. Redeploy Serverless revision после новой версии Lockbox.

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
| [`scripts/staging-preflight.sh`](../scripts/staging-preflight.sh) | P1.7 smokes |
| [`docs/staging-yandex-cloud.md`](./staging-yandex-cloud.md) | Deploy YC |
| [`docs/gcp-pollen-maps-keys.md`](./gcp-pollen-maps-keys.md) | GCP + Lockbox pollen |
| [`apps/mobile/eas.json`](../apps/mobile/eas.json) | Profile `staging` |
