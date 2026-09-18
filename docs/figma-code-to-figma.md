# Код → Figma (reverse handoff)

Пара к [`figma-handoff.md`](./figma-handoff.md) (Figma → код). Здесь **код — канон функциональности**; Figma — место отрисовки макетов без урезания продукта.

Пилот `screen-dashboard` (`3328:137`) короче Сегодня: нет week-ring, факторов-действий, insights, expert, status sheet. Не копировать его как «всю главную».

## Почему MCP не рисует файл

Cursor MCP `figma` (`https://mcp.figma.com/mcp`) **только читает**. Cloud Agent не создаёт pages/frames. Отрисовка — человек в Figma Desktop по чеклисту [`figma/pages.md`](./figma/pages.md).

## Пакет в репозитории

| Файл | Зачем |
|------|--------|
| [`figma/tokens.json`](./figma/tokens.json) | Variables Light/Dark/Layout/Type; тест `figma-tokens.test.ts` |
| [`figma/tokens.studio.json`](./figma/tokens.studio.json) | импорт Tokens Studio |
| [`figma/tokens.csv`](./figma/tokens.csv) | импорт Variables без плагина |
| [`figma/components.md`](./figma/components.md) + [`figma/kit.html`](./figma/kit.html) | library |
| [`figma/flows.md`](./figma/flows.md) · [`figma/screen-specs.md`](./figma/screen-specs.md) | тапы, gating, стикеры |
| [`figma/screen-inventory.md`](./figma/screen-inventory.md) | маршруты × FR §19 × дыры |
| [`figma/pages.md`](./figma/pages.md) | 00–09 в Izzy library |
| [`figma/traces/`](./figma/traces/) | PNG-референс |
| [`figma/delta.md`](./figma/delta.md) | page 09 до утверждения волны |
| [`design-mockup.html`](./design-mockup.html) | HTML-зеркало (4 таба + SOS) |

## Источники истины

| Слой | Где | Что уходит в Figma |
|------|-----|-------------------|
| IA | FR-UX-04, `(tabs)/_layout.tsx` | 4 вкладки + SOS-control; маркет из хаба |
| Экраны | FR §19 + `apps/mobile/app/**` | каждый маршрут = frame + состояния |
| Gating | [`cjm-profile-diary.md`](./cjm-profile-diary.md), `profile-capabilities.ts` | секции дневника/шкал/АСИТ от explicit conditions |
| Токены | `theme.ts` / `layout.ts` / `typography.ts` / [`brand-claro-green.md`](./brand-claro-green.md) | Variables; ACTION `full` vs STATE `sm/md/card` |
| Компоненты | skill product-designer | Button, GlassCard, headers, Empty/Error/Skeleton |
| Copy | `useTranslation()` + RU | на фреймах RU; +30% DE пометкой |

Не рисовать как «логику»: пороги GINA в `packages/core`, SQL, feature-flag ветки. На макете — видимый исход (есть данные / нет / offline).

## Волны

1. Tokens + Components  
2. Ядро: Сегодня (полный), Журнал, Скан, Карта, SOS  
3. Хаб  
4. Вход / wizard  
5. Клинические оверлеи (gating)

## Как попасть в Figma

1. Импорт Variables из `tokens.studio.json` / `tokens.csv`.  
2. Собрать page 02 из `kit.html`.  
3. PNG из `traces/` на page 08 (opacity ~30%).  
4. Векторные фреймы из компонентов, не трассировка.  
5. Стикеры из `screen-specs.md`.  
6. После утверждения волны — [`figma-handoff.md`](./figma-handoff.md) обратно в код (композиция; handlers, оси колец, SOS без профиля не удалять).

Не делать: массовый скриншот приложения без стикеров FR. Не делать: агент «дописывает» файл через недокументированный write API.

## Критерий готовности волны

Дизайнер рисует экран **без JSX**, имея токены, компоненты, флоу, 2–4 состояния, RU-copy и инварианты: оси колец, SOS без профиля, offline ≠ error, маркет не таб.
