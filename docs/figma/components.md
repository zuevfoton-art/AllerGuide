# 02 Components — library spec

Рисовать варианты в Figma из этих свойств. Hex только из [`tokens.json`](./tokens.json). Геометрия ACTION vs STATE: [product-designer skill](../../.cursor/skills/product-designer/SKILL.md) §3.

## Button

Код: `apps/mobile/src/components/Button.tsx`.

| Variant | Fill | Ink | Радиус | Когда |
|---------|------|-----|--------|-------|
| `primary` | `accent` | `onAccent` | `full` | одна primary на поверхность |
| `secondary` | `card` + border `border` | `text` | `full` | |
| `ghost` | transparent | `head` | `full` | текстовая ссылка, не mint fill |
| `danger` | `danger` | `onDanger` | `full` | SOS / удалить |

| Size | Мин. высота |
|------|-------------|
| `sm` | `tapMinHeightSm` 36 (+ hitSlop) |
| `md` | `tapMinHeight` 44 / primary 52 |
| `lg` | `tapMinHeightCrisis` 60 — только кризис |

Shadow: `raised` / `raisedStrong` на ACTION, не на чипах.

## GlassCard

Код: `GlassCard.tsx`. Радиус `card` 20.

| Prop | Токены |
|------|--------|
| `variant="default"` | `card` + `border` |
| `variant="soft"` | `foam` / `accentLight` wash |
| `zone="calm"` | `successLight` / `successBorder`; текст зоны `green` |
| `zone="attention"` | `warningLight` |
| `zone="alarm"` | `dangerLight` |

## Headers (не смешивать)

| Семья | Компонент | Когда |
|-------|-----------|-------|
| Таб | `TabScreenHeader` | корневые вкладки |
| Стек | `ScreenHeader` | вложенный «назад» |
| Юридический | `ScreenBackBrandHeader` | политика / оферта |
| Auth | `AuthHero` | login/register |

## TabBar + SOS

4 слота: Сегодня, Журнал, Скан, Карта. Active: `accentLight` fill + `accentMid` border.

SOS — **не** пятый равный таб: permanent `danger` tint, ≥44 pt, доступен без профиля.

## Chips / fields (STATE)

`radii.sm` 12 или `md` 16. **Запрещено** `full` на чипе, фильтре, табе-сегменте, инпуте.

Check-in 0–3 на Сегодня — ряд смайликов (severity), a11y по текстовым labels; не text chips.

## Empty / Error / Skeleton

`EmptyState`, `ErrorState`, `Skeleton` (reduce-motion). Offline ≠ error: ядро работает без API.

## Home-specific

| Блок | Компонент | testID |
|------|-----------|--------|
| Кольца | `ImmuneBalanceRings` | `immune-balance`, `immune-balance-score` |
| Карточка риска | `ImmuneBalanceCard` | `immune-balance-card`, `immune-balance-status` |
| Progress ×3 | pollen / air / diary | оси **не** «Симпт./Сканер» |
| Reading | `DailyReadingCard` compact | |
| Чек-ин | `QuickCheckInCard` smileys | `quick-check-in`, `quick-check-in-0…3` |
| Факторы | rows в `ImmuneBalanceStatusSheet` | `home-factor-pollen\|air\|diary\|clinical` |
| Неделя | `WeekRingCard` на `/(tabs)/diary` | не на home |
| Insights | | `home-insights` |

HTML-kit: [`kit.html`](./kit.html) (открыть в браузере, импорт PNG на page 02).
