# EAS Staging — backend-integrated internal build

**Roadmap:** Phase 1 · [P1.2b](phase1-phase2-issues.md)  
**Профиль:** `staging` в [`apps/mobile/eas.json`](../apps/mobile/eas.json)

Internal-сборка для closed beta: **backend auth, cloud sync и AI scan включены**. Требует живой staging API ([`staging-deploy.md`](staging-deploy.md)).

> Offline-only smoke без сервера — используйте профиль [`preview`](eas-internal-preview.md).

---

## Отличие от `preview`

| Переменная | `preview` | `staging` |
|------------|-----------|-----------|
| `EXPO_PUBLIC_API_URL` | не задан (localhost по умолчанию в dev) | `https://api.staging.allerguide.app` |
| `EXPO_PUBLIC_BACKEND_AUTH` | `false` | **`true`** |
| `EXPO_PUBLIC_CLOUD_SYNC` | `false` | **`true`** |
| `EXPO_PUBLIC_AI_SCAN_ENABLED` | `false` | **`true`** |
| `EXPO_PUBLIC_PRODUCT_DB` | `false` | `false` |
| EAS channel | `preview` | `staging` |

---

## Предпосылки

1. Staging API доступен: `curl https://api.staging.allerguide.app/api/health` → 200 ([P1.1c](staging-deploy.md))
2. `eas login` и реальный `projectId` в [`app.json`](../apps/mobile/app.json) (см. [preview runbook](eas-internal-preview.md))
3. Apple/Google credentials для internal distribution (те же, что для preview)

---

## Быстрый старт

```bash
pnpm install
./scripts/first-staging-build.sh          # Android по умолчанию
./scripts/first-staging-build.sh ios
```

Вручную:

```bash
cd apps/mobile
pnpm exec eas login
pnpm build:staging:android
```

---

## Сборка

```bash
cd apps/mobile

pnpm build:staging              # iOS + Android
pnpm build:staging:android      # APK (рекомендуется для первого smoke)
pnpm build:staging:ios          # TestFlight internal
```

---

## Smoke после установки (P1.2c)

Минимум перед closed beta:

1. **Register** — новый email на staging API
2. **Login** — JWT сохранён, перезапуск приложения сохраняет сессию
3. **Create profile** — dual-write на сервер (`POST /api/profiles`)
4. **Upload backup** — достигает `POST /api/sync/backup` (после recovery key UX в P1.3b)
5. **AI scan** — текст состава → ответ от `/api/scan`

Полный чеклист: [`qa-checklist.md`](qa-checklist.md) (секция staging).

---

## Установка на устройство

Как у preview — [expo.dev](https://expo.dev) → Builds → QR / APK link (Android) или TestFlight (iOS). См. [`eas-internal-preview.md` § Распространение](eas-internal-preview.md).

**Важно:** staging и preview используют один `com.allerguide.app` — перед установкой staging APK удалите preview-сборку с тем же package, если установка падает.

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Register/login «Сервер недоступен» | Проверьте P1.1c, URL в `eas.json` staging env |
| Sync «недоступна» | API: `SYNC_ENABLED=true`; на клиенте флаг уже `true` в staging |
| AI scan fallback на mock | API: `AI_SCAN_ENABLED=true`, `OPENAI_API_KEY`, JWT |
| Build fails | Запускайте из `apps/mobile`; см. [preview troubleshooting](eas-internal-preview.md) |

---

## Связанные файлы

- [`apps/mobile/eas.json`](../apps/mobile/eas.json)
- [`apps/mobile/src/constants/features.ts`](../apps/mobile/src/constants/features.ts)
- [`docs/staging-deploy.md`](staging-deploy.md)
- [`docs/adr/001-dual-write.md`](adr/001-dual-write.md)
