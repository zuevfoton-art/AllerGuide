# Phase 0 — отчёт о стабилизации MVP

**Roadmap:** [P0.1–P0.5](roadmap-to-prod.md#phase-0--stabilization-mvp--internal-alpha)  
**Ветка:** `cursor/phase-0-stabilization-6a26`

## Сводка

| ID | Задача | Статус | Примечание |
|----|--------|--------|------------|
| P0.1 | Регрессионный чеклист | ⚠️ Частично | Автопроверки + web smoke; native — после EAS preview |
| P0.2 | Критичные баги MVP | ✅ | Flaky temporal test; legal links; IndexedDB в privacy |
| P0.3 | README | ✅ | Feature flags, IndexedDB, QA/EAS ссылки |
| P0.4 | EAS preview | ⚠️ Готово к сборке | Скрипт + docs; нужен `eas login` и реальный `projectId` |
| P0.5 | Legal i18n | ✅ | Privacy + Terms на 6 языках |

## Автоматические проверки

| Команда | Результат |
|---------|-----------|
| `pnpm install` | ✅ |
| `pnpm typecheck` | ✅ |
| `pnpm test` | ✅ (после фикса `diary-stats-phase-c.test.ts`) |
| `pnpm --filter mobile lint` | ✅ |

## Изменения в коде

- **Legal:** `src/i18n/legal-content.ts` — Privacy/Terms на ru, en, es, fr, de, it
- **UI:** компонент `LegalLinks` в профиле и настройках (`/legal/privacy`, `/legal/terms`)
- **Тест:** `diary-stats-phase-c.test.ts` — относительные даты вместо фиксированных (не падал через 7+ дней)
- **Документация:** обновлены `README.md`, `docs/qa-checklist.md`

## Ручной прогон (осталось)

### Web smoke (`http://localhost:5000`) — 2026-06-30

- [x] Login / register + language picker (ru → en)
- [x] `/legal/privacy` на выбранном языке (en)
- [x] `/legal/terms` на выбранном языке (en)
- [x] Страница входа без crash

### Native (после EAS preview)

```bash
./scripts/first-preview-build.sh android
# или ios — см. docs/eas-internal-preview.md
```

- [ ] Установка на ≥3 устройства
- [ ] Полный прогон [`qa-checklist.md`](qa-checklist.md)
- [ ] Cold start, permissions (camera, location, notifications)

## Метаданные прогона QA

| Поле | Значение |
|------|----------|
| Дата | 2026-06-30 |
| Коммит | (см. merge PR) |
| Backend flags | все OFF |
| Локали legal | ru, en, es, fr, de, it |

**Итог автоматической части Phase 0:** готово к internal alpha-сборке. Store submission — Phase 3+.
