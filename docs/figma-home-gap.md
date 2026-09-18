# Gap-анализ: Figma → «Сегодня» (пилот)

Дата: 2026-09-18 · ветки: `cursor/figma-to-code-pilot-8015` → `cursor/figma-theme-sync-8015` (PR #422)

## Решения по развилкам (2026-09-18)

| Вопрос | Решение |
|--------|---------|
| Фрейм `3328-11` | Готовый экран **и** UI-kit; **сохранить всю функциональность main** (insights, expert, sheets, SOS, rings, factors…) |
| Кольца #412 | Уже есть в Figma — оставляем и выравниваем визуал |
| Цвета | **Можно менять** `theme.ts` + brand-doc под Figma |
| OAuth | Пользователь подключает Figma OAuth в Cursor Desktop; Cloud — REST PAT fallback |

## Источники

| Источник | Статус |
|----------|--------|
| Figma [node `3328-11`](https://www.figma.com/design/k0i0hCj3CPpaVvz2wMEy3A/Izzy-s-team-library?node-id=3328-11) | REST read OK (PAT); MCP OAuth — Desktop |
| Канон пилота | [`docs/design-mockup.html`](./design-mockup.html) `#screen-home` |
| Код | [`apps/mobile/app/(tabs)/home.tsx`](../apps/mobile/app/(tabs)/home.tsx) |

**Канон screen-frame:** `screens-flow-map` (`3328:11`) → **`screen-dashboard`** (`3328:137`) = «Сегодня» / home.

## Каркас: Figma `screen-dashboard` ↔ код

| Блок Figma | Код | Вердикт |
|------------|-----|---------|
| `top-header` brand + SOS + avatar | `TabScreenHeader` / SOS | OK (продуктовый header) |
| `risk-card` → centered rings 220 + `progress-cards` ×3 + status summary | `ImmuneBalanceCard` + `ImmuneBalanceRings` (200) + progress mini-cards + «Подробнее» → sheet | **Сделано** — оси pollen/air/diary; factors в sheet |
| `recommendations-card` | `DailyReadingCard` compact + CTA | OK (#421) |
| check-in (в mockup bubble) | `QuickCheckInCard` compact smileys (0–3) | **Сделано** — смайлики вместо 4 text chips |
| Week ring | — на главной убран; `WeekRingCard` на `/(tabs)/diary` | **Сделано** — активность недели только в дневнике |
| Factors / TierScale | в `ImmuneBalanceStatusSheet` (не отдельная карточка на home) | **Сделано** |
| `expert-hub` | expert section на home | оставить |
| Insights / SOS / clinical ring | есть в коде | **не удалять** |

## Токены

Синк light palette с Figma (#422). AA overrides: `textMuted` `#5F716B`, calm-zone `green`/`scannerSafeText` `#047857` (Figma fill `#10B981` остаётся на `success` для колец).

## Дельты пилота

1. **Compact reading** — CTA `reading.action.label` (#421).
2. **Compact check-in** — ряд смайликов 😊😐😕😣 (severity 0–3), a11y по `SEVERITY_0_3_LABELS`.
3. **Theme sync** — sage/cream/SOS из Figma (#422).
4. **ImmuneBalance layout** — centered rings + 3 progress mini-cards + «Подробнее» → status/factors sheet.
5. Mockup + `docs/screens/home.html` — зеркало risk-card / smileys.
6. Insights / expert / SOS / rings — **не удалять**; factors только в sheet.
7. Week ring убран с Сегодня — активность недели только на дневнике.

## Отклонено / отложено

- Удаление ImmuneBalance колец / factors — продукт важнее полного паритета с коротким Figma dashboard.
- Переименование осей колец в «Симпт./Сканер» — доменная модель AllerGuide (пыльца/воздух/дневник).
- Work Sans font family — отдельный шаг.
- Массовый перенос остальных табов.
