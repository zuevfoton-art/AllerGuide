# 00–09 страницы Izzy library

Файл: [Izzy's team library](https://www.figma.com/design/k0i0hCj3CPpaVvz2wMEy3A/Izzy-s-team-library).  
Существующий `screens-flow-map` (`3328:11`) **не удалять** — рядом новые pages. Cloud Agent **не пишет** в Figma (MCP read-only). Этот файл — чеклист для **человека в Figma Desktop**.

Съём логики: `main` `05569d1c` + пакет `docs/figma/`. Правило cover: **логика = код**.

## Создать pages

| Page | Содержимое | Готово в репо |
|------|------------|---------------|
| **00 Cover** | Дата, коммит, «логика = код», ссылка на [`figma-code-to-figma.md`](../figma-code-to-figma.md) | текст cover — этот ряд |
| **01 Tokens** | Variables `Claro/Light`, `Claro/Dark`, `Layout`, `Typography` | [`tokens.json`](./tokens.json) · [`tokens.studio.json`](./tokens.studio.json) · [`tokens.csv`](./tokens.csv) |
| **02 Components** | Button × variant × size; GlassCard × variant × zone; TabBar+SOS; headers; chips STATE; Empty/Error/Skeleton | [`components.md`](./components.md) · [`kit.html`](./kit.html) · `traces/kit.png` |
| **03 Flows** | A запуск, B день, C кризис, D хаб — frames + connectors | [`flows.md`](./flows.md) |
| **04 Screens · Ядро** | Волна 2: полный Сегодня, Журнал + пикер + wizard, Скан, Карта, SOS + sos-empty | [`screen-specs.md`](./screen-specs.md) |
| **05 Screens · Хаб** | profile, profiles, profile-edit, settings, market, expert, ask, sos-edit, notifications | inventory волна 3 |
| **06 Screens · Вход** | login, register, intro, onboarding, profile-setup (required vs deferred) | волна 4 |
| **07 Screens · Клиника** | clinical-scales, doctor-report, therapy, asit, action plans, food-drug | волна 5 + gating |
| **08 Traces** | PNG opacity ~30% locked | [`traces/`](./traces/) |
| **09 Delta vs code** | «нарисовали иначе / код оставить» | [`delta.md`](./delta.md) |

На каждом screen-frame стикер из [`screen-specs.md`](./screen-specs.md). Состояния: default / empty / offline / no-profile / dark (где есть).

## Импорт Variables (Desktop)

1. Figma Desktop → Tokens Studio (или Variables из CSV).
2. Import [`tokens.studio.json`](./tokens.studio.json) или [`tokens.json`](./tokens.json) / [`tokens.csv`](./tokens.csv).
3. Проверить AA: `textMuted` `#5F716B`, zone `green` `#047857`, SOS `#E53E3E`.
4. Не подменять оси колец на «Симпт./Сканер».
5. Собрать 02 из `kit.html` / `traces/kit.png`; экраны — из компонентов, не трассировка PNG.

## После отрисовки волны

Обновить [`delta.md`](./delta.md) и профильный `docs/figma-*-gap.md`. В код — только [`figma-handoff.md`](../figma-handoff.md) (композиция; SOS/радиусы/оси колец не выкидывать).
