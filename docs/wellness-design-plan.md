# AllerGuide — план wellness-дизайна

Документ фиксирует перевод мобильного UI (`apps/mobile`) на принципы [Wellness Design](https://bonnieandslide.com/blog/wellness-design) (Bonnie&Slide) и поэтапный план внедрения.

**Связанные документы:** [`architecture.md`](./architecture.md) · [`development-rules.md`](./development-rules.md) · [`brand-claro-green.md`](./brand-claro-green.md) · [`ux-audit-2026-08.md`](./ux-audit-2026-08.md) · [`ux-improvement-plan.md`](./ux-improvement-plan.md)

> Принцип: все улучшения совместимы с offline-first и слоями `core` → `services` → UI. Экраны остаются тонкими. Вербальные градации благополучия (`wellness-display.ts`) сохраняем — визуал их сопровождает, а не заменяет цифрами. Политика Claro teal не меняется: смягчаем только фоны и нейтральные поверхности.

---

## 1. Что сохраняем

- Тёмная тема с дефолтом `system` (`theme-store.ts`, `ThemeToggle` на `/profile`).
- Семья Claro teal: `accent` / `accentLight` / `accentMid`. Запрещённые медицинские синие — [`brand-claro-green.md`](./brand-claro-green.md).
- `danger` / SOS, `success` / `warning` traffic-light, `head` navy — не трогаем.
- Существующие визуализации: `DiaryTrendChart`, `DiaryCalendarHeatmap`, `PollenForecastStrip`, `PollenIndexCard`, шкалы UAQI.
- Quiet hours, granular notification toggles, `limitRemindersPerDay`.

---

## 2. Расхождение с бренд-политикой

[`brand-claro-green.md`](./brand-claro-green.md) §Правила #2 предписывает soft wellness surfaces через `GlassCard variant="soft"`. В `apps/mobile/src/components/GlassCard.tsx` остался только `zone`. Фаза **W2** возвращает `variant?: 'default' | 'soft'` (soft = `accentLight` фон + `accentMid` бордер) и применяет его на wellness-карточках Главной.

---

## 3. Принцип → долг → фаза

| Принцип (источник) | Долг в коде | Фаза | Статус |
|--------------------|-------------|------|--------|
| Тёмная тема как забота о зрении | Закрыто. Расширить контраст-гейт | W2 | backlog |
| Оптимальная типографика | Нет `lineHeight`/`tracking`; ~449 литеральных `fontSize`; сироты 14/16 px | W1 | backlog |
| Природные, ненавязчивые цвета | Холодные синие фоны (`bg #F4F6F9`, dark `#0B1120`) | W2 | backlog |
| Продуманные микро-взаимодействия | Нет токенов движения; reduce-motion только в Skeleton и pollen plume | W3 | backlog |
| Ограниченное число поп-апов | 26 `Alert.alert`; `UndoBanner` в одном месте | W4 | backlog |
| Гибкость и персонализация | Нет размера текста и переключателя анимаций | W5 | backlog |
| Минимум визуального шума | Карта: ~390–430 pt хрома (E14); Сканер: до 17 блоков результата | W6 | backlog |
| Баланс текста и визуала | `AsitCourseCard` не смонтирован; шкалы — текст без тренда; факторы Главной без шкалы | W8 | backlog |
| Единые заголовки и навигация | 9 `CardTitle` vs 38–61 ad-hoc; `ui.cardTitle` (12 px) как H2; 6 систем заголовков | W9 | backlog |
| Бережный возврат после паузы | Нет детектора 3+ дней; нет чек-ина в один тап | W7 | backlog |

---

## 4. Фазы

Порядок: **W0 → W1 → W9 → W2 → W3 → W4 → W5 → W6 → W8 → W7**.

| Фаза | Содержание | Гейт |
|------|------------|------|
| **W0** | Этот документ + ссылки в индексе | — |
| **W1** | `lineHeights`, `tracking`, `bodyMd`/`h4`, `textStyles`; миграция центральных стилей и топ-6 экранов | `pnpm check:design-tokens` |
| **W9** | Иерархия заголовков, `TabScreenHeader`, одна primary-кнопка на поверхность | расширение `check:design-tokens` |
| **W2** | Смягчение фонов; `GlassCard variant="soft"` | `theme-contrast.test.ts` AA 4.5:1 |
| **W3** | `motion.ts`, `useReducedMotion`, Modal / haptics / press opacity | unit + ручной reduce-motion |
| **W4** | `StatusBanner` вместо низкорисковых `Alert` | деструктивные confirm остаются |
| **W5** | Размер текста и спокойные анимации на `/profile` | `settings_changed` |
| **W6** | Хром Карты (E14), прогрессивное раскрытие Сканера, Skeleton вместо спиннеров | визуальная проверка 667 pt |
| **W8** | Смонтировать ASIT/therapy карточки, тренд шкал, `TierScale`, SOS chips/steps, collapsible Disclaimer | без новых библиотек |
| **W7** | Алгоритм мягкого возвращения 3/5/8/14 дней | табличные тесты core + taxonomy |

### W7 — лестница возвращения (кратко)

- День 0–2: существующие `diary-missing-today` и ежедневное напоминание.
- День 3 `quick-checkin`: меняется только текст уже запланированного пуша; на Главной чек-ин в один тап (чипы 0–3).
- День 5–7 `value`: шкала `uas7` + статья `pollinosis-basics`; один re-engagement push.
- День 8–13 `reframe`: дневник не просим; push только если `value` был открыт.
- День 14+ `restart`: push прекращается; карточка «Начнём заново» с предложением снизить частоту.

Правила: не более 2 push за 14 дней; тишина после двух неоткрытых; `diary-return` — самый низкий приоритет в `limitRemindersPerDay`; без вины и клинических угроз. Push только если пользователь и дневник не ведёт, и в приложение не заходит.

Чек-ин в один тап: снять `required` со шага `symptoms`; валидность держится на `severity0_3`. Нулевой чек-ин не должен быть symptom day в `computeDiaryPenalty`.

---

## 5. Критерии приёмки

- `pnpm typecheck`, `pnpm --filter mobile lint`, `pnpm test`.
- `pnpm check:design-tokens` и `pnpm check:analytics-taxonomy` входят в `pnpm rc-gate`.
- Контраст: `text` / `textSecondary` / `textMuted` / `head` на `bg` и `card` ≥ 4.5:1 в обеих темах. Исключение `onAccent` на `accent` остаётся.
- Одна visible primary-кнопка на поверхность (W9).
- Карта видна в первом экране на 667 pt (W6 / E14).
- W7: табличные тесты порогов, тишины после двух проигнорированных, приоритета ниже клинических, сброса эпизода; серия нулевых чек-инов не ухудшает индекс.
- Ручная проверка web: светлая и тёмная тема; настройки размера текста и спокойных анимаций; стадии возвращения на подменённых датах.

---

## 6. Что решено не делать

- Не переписывать тела статей эксперта под разметку абзацев (12 × 6 локалей при среднем теле ~258 символов).
- Не заменять вербальные градации числами.
- Не вводить библиотеку графиков.
- Не менять `accent`, `danger`, `success`, `warning` и `head`.
