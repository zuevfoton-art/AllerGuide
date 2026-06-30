# P1.7 — Closed beta gate (staging)

**Roadmap:** Phase 1 milestone · [phase1-phase2-issues.md](phase1-phase2-issues.md)  
**Сборка:** EAS profile `staging` ([eas-staging-build.md](eas-staging-build.md))  
**API:** [staging-deploy.md](staging-deploy.md)

Закрытая бета на **10–20 тестеров** с backend-интеграцией (auth, sync, AI scan). Цель — подтвердить готовность Phase 1 перед Phase 2 (Maestro E2E, Sentry).

---

## Критерии входа (gate in)

Все пункты обязательны **до** рассылки сборки тестерам.

| # | Критерий | Проверка |
|---|----------|----------|
| G.1 | Staging API жив | `./scripts/staging-preflight.sh` → Pass |
| G.2 | CI green на `main` | `quality` + `api-integration` jobs |
| G.3 | EAS staging build свежий | Коммит ≤ 7 дней; channel `staging` |
| G.4 | Internal QA | [qa-checklist.md](qa-checklist.md): S.1–S.4, O.1–O.3, B.1–B.6, C.1 |
| G.5 | Recovery key policy | Тестеры проинструктированы сохранять ключ вне приложения |
| G.6 | Crash reporting (опц.) | `EXPO_PUBLIC_SENTRY_DSN` на staging — рекомендуется |

```bash
./scripts/staging-preflight.sh
```

---

## Распространение сборки

### Android (рекомендуется для первой волны)

```bash
./scripts/first-staging-build.sh android
```

Expo → Builds → internal APK link → разослать тестерам (Telegram/email).

### iOS

```bash
./scripts/first-staging-build.sh ios
```

TestFlight internal group «Closed Beta». Требуется Apple Developer.

### Инструкция тестерам

Краткий бриф на русском: [beta-tester-brief-ru.md](beta-tester-brief-ru.md).

---

## Матрица тестеров (10–20 человек)

Скопируйте таблицу в issue / Notion / spreadsheet.

| # | Имя | Платформа | Email staging | S.auth | O.offline | B.sync | C.scan | Feedback issue |
|---|-----|-----------|---------------|--------|-----------|--------|--------|----------------|
| 1 | | Android | | ☐ | ☐ | ☐ | ☐ | |
| 2 | | iOS | | ☐ | ☐ | ☐ | ☐ | |
| … | | | | | | | | |

**Минимальное покрытие:**

- ≥ **8** Android + ≥ **4** iOS (или наоборот)
- ≥ **2** пары устройств для **B.1–B.6** (cross-device sync)
- ≥ **1** тестер с airplane mode (O.1–O.3)

Сценарии: [qa-checklist.md](qa-checklist.md) § Staging, P1.2e, P1.4c, P1.5b.

---

## Критерии выхода (gate out)

| # | Критерий | Порог |
|---|----------|-------|
| O.1 | Тестеры завершили onboarding | ≥ 80% (8/10 мин.) |
| O.2 | Auth S.1–S.3 без P0 | 0 блокеров auth |
| O.3 | Cross-device backup B.1–B.6 | ≥ 1 успешная пара устройств |
| O.4 | AI scan C.1 | ≥ 70% тестеров видят «ИИ-анализ» |
| O.5 | Crash-free sessions | ≥ 95% (если Sentry включён) |
| O.6 | Критические баги | 0 открытых P0; P1 ≤ 3 с workaround |

**Sign-off:** Product + QA → закрыть milestone Phase 1 → старт P2.1a.

---

## Сбор обратной связи

1. GitHub Issues с меткой `beta` + `phase-1` ([шаблон](../.github/ISSUE_TEMPLATE/beta-feedback.md))
2. Формат: шаги, ожидание/факт, скриншот, платформа, build #
3. Еженедельный triage: P0 в течение 24 ч, P1 в течение 7 дней

---

## Откат

| Ситуация | Действие |
|----------|----------|
| Массовый auth failure | Проверить staging API + JWT; приостановить рассылку |
| Sync decrypt failures | Проверить recovery key flow; документировать workaround |
| OpenAI budget exhausted | Временно `AI_SCAN_ENABLED=false` на API; mock на клиенте |
| Критический crash | Снять build с distribution; hotfix → новый staging build |

---

## Связанные документы

- [qa-checklist.md](qa-checklist.md) — полные сценарии
- [eas-staging-build.md](eas-staging-build.md) — сборка и smoke
- [staging-deploy.md](staging-deploy.md) — API и секреты
- [roadmap-to-prod.md](roadmap-to-prod.md) — Phase 2 после P1.7
