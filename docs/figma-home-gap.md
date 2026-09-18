# Gap-анализ: Figma → «Сегодня» (пилот)

Дата: 2026-09-18 · ветка пилота: `cursor/figma-to-code-pilot-8015`

## Решения по развилкам (2026-09-18)

| Вопрос | Решение |
|--------|---------|
| Фрейм `3328-11` | Готовый экран **и** UI-kit; **сохранить всю функциональность main** (insights, expert, sheets, SOS, rings, factors…) |
| Кольца #412 | Уже есть в Figma — оставляем и выравниваем визуал |
| Цвета | **Можно менять** `theme.ts` + brand-doc под Figma |
| OAuth | Пользователь подключает Figma OAuth в Cursor Desktop |

## Источники

| Источник | Статус |
|----------|--------|
| Figma [node `3328-11`](https://www.figma.com/design/k0i0hCj3CPpaVvz2wMEy3A/Izzy-s-team-library?node-id=3328-11) | MCP `figma` в конфиге; read после OAuth Connect |
| Канон пилота (fallback до MCP-read) | [`docs/design-mockup.html`](./design-mockup.html) `#screen-home` |
| Код | [`apps/mobile/app/(tabs)/home.tsx`](../apps/mobile/app/(tabs)/home.tsx) |

**Канон screen-frame:** `screens-flow-map` (`3328:11`) → **`screen-dashboard`** (`3328:137`) = «Сегодня» / home.

## Каркас: mockup / код

| Блок | Mockup `#screen-home` | `home.tsx` | Вердикт |
|------|----------------------|------------|---------|
| Tab header + date + «Сегодня» | да | `TabScreenHeader` | OK |
| ImmuneBalance rings + day nav + status + legend | да | `ImmuneBalanceCard` | OK — оставляем (#412) |
| Compact reading + check-in row | да (inline chips + CTA) | `DailyReadingCard` compact (без CTA) + `QuickCheckInCard` compact (только hint → sheet) | **Дельта** |
| Week ring | да | `WeekRingCard` | OK |
| Factors + TierScale | да | `GlassCard` + `TierScale` | OK |
| Insights + expert | нет в phone-mockup hero | есть ниже | оставить (продукт) |

## Токены

Семантика Claro побеждает (accent / success / warning rings, soft `GlassCard`). Новых hex в контролах не требуется. Atmosphere wash reading уже allowlisted в brand-doc.

## Дельты пилота (этот PR)

1. **Compact reading** — `Button` sm primary с `reading.action.label` (CTA как в mockup/Figma).
2. **Compact check-in** — сетка 2×2 чипов 0–3 inline; sheet только в non-compact (функциональность main сохранена).
3. **`docs/screens/home.html`** — ImmuneBalance + bubble + week-ring + factors.
4. Процедура + MCP Figma; цвета под Figma — после OAuth (пользователь Connect) можно править `theme.ts` + brand-doc.
5. Insights / expert / SOS / factors / rings — **не удалять**.

## Отклонено / отложено

- Удаление колец — кольца есть в Figma.
- Смена палитры в `theme.ts` до успешного MCP-read токенов из Figma (ждём OAuth).
- Массовый перенос остальных табов.
