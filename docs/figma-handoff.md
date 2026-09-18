# Figma → код (handoff)

Процедура переноса макетов AllerGuide в `apps/mobile` без генерации «пиксель-в-пиксель» UI и без обхода токенов Claro.

## Источник макета

| Поле | Значение |
|------|----------|
| Файл | [Izzy's team library](https://www.figma.com/design/k0i0hCj3CPpaVvz2wMEy3A/Izzy-s-team-library) |
| Пилот-нода (стартовая) | `3328-11` ([открыть](https://www.figma.com/design/k0i0hCj3CPpaVvz2wMEy3A/Izzy-s-team-library?node-id=3328-11)) |
| Канон пилота в приложении | экран «Сегодня» — [`apps/mobile/app/(tabs)/home.tsx`](../apps/mobile/app/(tabs)/home.tsx) |
| HTML-зеркало | [`docs/design-mockup.html`](./design-mockup.html) `#screen-home` |

Если `3328-11` — страница UI-kit, а не экран: зафиксируйте ниже `node-id` ближайшего screen-frame «Today / Home / Сегодня» и используйте его как канон пилота.

**Канон screen-frame:** `3328:11` (`screens-flow-map`) → **`3328:137` (`screen-dashboard`)** — «Сегодня». Gap: [`docs/figma-home-gap.md`](./figma-home-gap.md).

## Конфликты макет ↔ код

| Слой | Кто побеждает |
|------|----------------|
| Композиция, плотность, иерархия блоков | Figma |
| Семантические цвета, SOS danger, ACTION/STATE радиусы | Figma может задавать новые значения — правим [`theme.ts`](../apps/mobile/src/constants/theme.ts) + [`docs/brand-claro-green.md`](./brand-claro-green.md), не литералы в экранах |
| ImmuneBalance rings / week-ring (PR #412) | Есть в Figma — **оставляем**; подгоняем визуал. Всю функциональность main (insights, expert, sheets…) **не выкидывать** |
| Новый hex | Только через `theme.ts` (+ запись в brand-doc); не литералы в `app/**` / `components/**` |

## Шаги агента / разработчика

1. **Прочитать фрейм** — Cursor MCP `figma` (`https://mcp.figma.com/mcp`, OAuth). Settings → Tools & MCP → Connect. Cloud Agent: egress allowlist `mcp.figma.com`.
2. **Спека** — skill [`.cursor/skills/product-designer/SKILL.md`](../.cursor/skills/product-designer/SKILL.md): иерархия хедера, состояния loading/empty/error/offline, a11y, `testID`, ключи i18n.
3. **Маппинг на компоненты** — не плодить третьи кнопки/карточки:
   - экран: `Screen`, `TabScreenHeader` / `ScreenHeader`
   - поверхности: `GlassCard` (`soft` / zone)
   - CTA: `Button` (`primary` / `secondary` / `ghost` / `danger`)
   - home: `ImmuneBalanceCard`, `DailyReadingCard`, `QuickCheckInCard`, `WeekRingCard`, `TierScale`
4. **Код** — оркестрация в `app/**/*.tsx`; стили через `useTheme()` / `useThemedStyles()` / `space` / `radii` / `density`.
5. **i18n** — `types.ts` + все 6 локалей `locales/{ru,en,es,fr,de,it}.ts`.
6. **Синк mockup** — обновить `#screen-home` в `design-mockup.html` (и при необходимости `docs/screens/home.html`).
7. **Гейты** — `pnpm check:design-tokens`, typecheck/lint затронутого, web smoke на `http://localhost:5000`.

## Fallback без OAuth

Если MCP Figma недоступен (Cloud без OAuth): экспортируйте PNG/PDF фрейма или приложите скрин к задаче; агент ведёт gap-анализ по экспорту + ссылке, MCP всё равно остаётся в [`.cursor/mcp.json`](../.cursor/mcp.json) для Desktop.

## Связанное

- MCP-каталог: [`docs/mcp-servers.md`](./mcp-servers.md)
- Роли: [`docs/agents-roles-and-mcp-plan.md`](./agents-roles-and-mcp-plan.md) (Tier 3 Figma)
- North-star «Сегодня»: [`docs/wellness-ux-north-star.md`](./wellness-ux-north-star.md) §4.1
