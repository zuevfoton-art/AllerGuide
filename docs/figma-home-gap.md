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
| `risk-card` → centered rings 220 + `progress-cards` ×3 + status summary | `ImmuneBalanceCard` + `ImmuneBalanceRings` (200) + progress mini-cards + status CTA | **Сделано** (#422) — оси pollen/air/diary (не labels Симпт./Сканер) |
| `recommendations-card` | `DailyReadingCard` compact + CTA | OK (#421) |
| check-in (в mockup bubble) | `QuickCheckInCard` compact chips | OK (#421) |
| Week ring / Factors / TierScale | `WeekRingCard` + `GlassCard` + `TierScale` | OK — в Figma dashboard нет week-ring; оставляем продукт |
| `expert-hub` | expert section на home | оставить |
| Insights / SOS / clinical ring | есть в коде | **не удалять** |

## Токены

Синк light palette с Figma (#422). AA overrides: `textMuted` `#5F716B`, calm-zone `green`/`scannerSafeText` `#047857` (Figma fill `#10B981` остаётся на `success` для колец).

## Дельты пилота

1. **Compact reading** — CTA `reading.action.label` (#421).
2. **Compact check-in** — сетка 2×2 чипов (#421).
3. **Theme sync** — sage/cream/SOS из Figma (#422).
4. **ImmuneBalance layout** — centered rings + 3 progress mini-cards + status row (#422).
5. Mockup + `docs/screens/home.html` — зеркало risk-card.
6. Insights / expert / SOS / factors / rings — **не удалять**.

## Отклонено / отложено

- Удаление колец / week-ring / factors — продукт важнее полного паритета с коротким Figma dashboard.
- Переименование осей колец в «Симпт./Сканер» — доменная модель AllerGuide (пыльца/воздух/дневник).
- Work Sans font family — отдельный шаг.
- Массовый перенос остальных табов.
