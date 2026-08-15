# AllerGuide — план улучшения UX

Документ фиксирует предложения по улучшению пользовательского опыта мобильного приложения (`apps/mobile`) и поэтапный план их внедрения.

**Связанные документы:** [`architecture.md`](./architecture.md) · [`development-rules.md`](./development-rules.md) · [`functional-requirements.md`](./functional-requirements.md) · [`roadmap-to-prod.md`](./roadmap-to-prod.md)

> Принцип: все улучшения совместимы с offline-first и слоями `core` → `services` → UI. Экраны остаются тонкими, UX-логика выносится в компоненты/сервисы.

---

## 1. Сильные стороны (сохраняем)

- Единая дизайн-система Clinical Calm: токены темы, `GlassCard`, `Button`, типографика, светлая/тёмная/системная темы (`src/constants/theme.ts`).
- Адаптивный layout и web-ограничение ширины (`Screen.tsx`, `useResponsiveLayout`).
- Offline-first и чистое разделение слоёв — UX можно менять без правок БД.
- Disclaimer'ы на медицинских экранах (`Disclaimer`).
- Умные префиллы дневника по сканам/паспорту (`diary.tsx` → `openSection`).

---

## 2. Найденные проблемы (привязка к коду + критичность)

### Критичные

- **Сканер открывается с захардкоженным вводом** `'молоко, арахис, сахар'` (`scanner.tsx`) — выглядит как забытый отладочный дефолт.
- **Аварийный вызов спрятан внизу длинного скролла** (`sos.tsx`): кнопка «Позвонить 103» и кнопки звонка контактам (`size="sm"`, 36px) находятся в конце экрана. NFR-05 требует крупные touch-target на SOS.
- **Нет обработки и отображения ошибок** в `scanner.tsx` (`runCheck`/`runOcrCapture`) и `home.tsx` (`loadWellness`) — при сбое исчезает спиннер без сообщения и без retry.

### Высокие

- **Ручная кнопка «Обновить» в дневнике** (`diary.tsx`): данные грузятся через `useEffect`, не освежаются при возврате на вкладку.
- **Нет pull-to-refresh** — `Screen` оборачивает `ScrollView` без `RefreshControl`.
- **Рассинхрон навигации с ТЗ**: FR-UX-04 описывает 6 вкладок, фактически 4 (`market`/`map` скрыты `href:null`), но на главной есть ссылки на скрытые экраны.
- **Контраст `textMuted` ниже WCAG AA**: `#94A3B8` на белом ≈ 2.8:1 (норма 4.5:1).
- **Смена режима сканера не сбрасывает результат** — остаётся прошлый вердикт.

### Средние

- `ProfileSwitcher` не скроллится (сегмент с `flex:1`, длинные имена обрезаются).
- Маленькие touch-target и пробелы в a11y (chips, сворачиваемые заголовки SOS без `accessibilityRole/Label`).
- Слабые пустые состояния (просто текст без CTA).
- Нет скелетон-состояний загрузки.
- Удаление «безопасного продукта» без подтверждения/undo.
- Нет тактильной обратной связи (`expo-haptics`).

### Низкие / полировка

- Intro листается только кнопкой (нет свайпа).
- Инлайновый редактор дневника заменяет весь экран.
- «Подробнее» в карточке самочувствия ведёт на карту.

---

## 3. План внедрения (по приоритету, без календарных оценок)

### Этап A — Quick wins (низкая инвазивность, высокий эффект)

| # | Изменение | Файлы |
|---|-----------|-------|
| A1 | Очистить дефолт сканера: пустой ввод + placeholder | `scanner.tsx` |
| A2 | Сбрасывать результат/подсказку при смене режима | `scanner.tsx` |
| A3 | Поднять `textMuted` до контраста ≥4.5:1 (light + dark) | `theme.ts` |
| A4 | Увеличить кнопки звонка на SOS до `md` | `sos.tsx` |
| A5 | a11y-метки на SOS (звонки, сворачивание, ссылки) и chips | `sos.tsx`, `diary.tsx`, `scanner.tsx` |

### Этап B — Системные UX-примитивы

`useAsyncState`, `ErrorState`, `EmptyState`, `Skeleton`, `RefreshControl` в `Screen` + подключение на 4 основных экранах. Заменяет ручной «Обновить», вводит единые состояния загрузки/ошибки/пустоты.

| # | Изменение | Файлы |
|---|-----------|-------|
| B1 | Хук `useAsyncState` (loading/refreshing/error + reload/refresh) | `hooks/use-async-state.ts` |
| B2 | Компоненты `Skeleton`, `EmptyState`, `ErrorState` | `components/*` |
| B3 | Pull-to-refresh (`RefreshControl`) в `Screen` | `Screen.tsx` |
| B4 | Главная: `useAsyncState` + скелетон самочувствия + pull-to-refresh | `home.tsx` |
| B5 | Дневник: убран ручной «Обновить», `useFocusEffect` + pull-to-refresh + `EmptyState` | `diary.tsx` |
| B6 | Сканер: обработка ошибок + «Повторить» + pull-to-refresh истории | `scanner.tsx` |
| B7 | SOS: pull-to-refresh + `EmptyState` с CTA «Создать профиль» | `sos.tsx` |

### Этап C — Безопасность взаимодействия и доверие

| # | Изменение | Файлы |
|---|-----------|-------|
| C1 | `Screen.pinnedTop` — закреплённая панель над скроллом | `Screen.tsx` |
| C2 | `SosEmergencyBar` — звонок 103 + первый контакт, всегда виден | `SosEmergencyBar.tsx`, `sos.tsx` |
| C3 | `expo-haptics` + `haptics.ts` — опасный вердикт / успех / удаление | `haptics.ts`, `scanner.tsx` |
| C4 | Подтверждение + undo при удалении безопасного продукта | `UndoBanner.tsx`, `scanner.tsx` |

### Этап D — Навигация и онбординг

| # | Изменение | Файлы |
|---|-----------|-------|
| D1 | Вкладка «Ещё» — хаб Маркет / Карта / Эксперт / Настройки | `more.tsx`, `_layout.tsx`, i18n |
| D2 | Свайп-карусель intro (`FlatList` + `pagingEnabled`) | `onboarding-intro.tsx` |
| D3 | Модальный редактор дневника (`DiaryEditorModal`) | `DiaryEditorModal.tsx`, `diary.tsx` |
| D4 | Быстрые ссылки на главной → «Ещё» вместо скрытых вкладок | `home.tsx` |

### Этап E — Полировка и документация (аудит август 2026)

| # | Изменение | Файлы |
|---|-----------|-------|
| E9 | AuthForm на токены `Button` / `radii` / `fontSizes` | `AuthForm.tsx`, `PhoneInput.tsx` |
| E10 | Политика Dynamic Type + токены в Disclaimer | `typography.ts`, `Disclaimer.tsx`, `Button.tsx` |
| E11 | `eslint-plugin-react-native-a11y` (подписи у тач-элементов, warn) | `eslint.config.js` |
| E12 | QA 4.8 — 6 вкладок; FR-ONB-01 — актуальные слайды intro | `qa-checklist.md`, `functional-requirements.md` |

Каждый этап — отдельная ветка и PR; на UI-этапах обязательны `pnpm typecheck`, `pnpm --filter mobile lint` и ручная проверка web-сборки на светлой/тёмной теме.

---

## 4. Метрики успеха

- Onboarding completion ≥70%, D7 retention ≥25% (roadmap) — через `analytics-service`.
- Доля сканов с ошибкой без обратной связи → 0 после этапа B.
- Контраст всех текстов ≥ WCAG AA 4.5:1; ключевые touch-target ≥44px (NFR-05).
- Время до аварийного вызова на SOS (число скроллов) → 0 после этапа C.

---

## 5. Статус

| Этап | Статус |
|------|--------|
| A — Quick wins | Готово (PR) |
| B — UX-примитивы | Готово (PR) |
| C — Безопасность взаимодействия | Готово (PR) |
| D — Навигация и онбординг | Готово (PR) |
| E — Полировка и документация | Готово (PR) |
