# Brandbook 50 / 35 / 15 — политика цвета (UX/UI v2)

**Статус:** канон production · supersedes Earth Wellness olive / Nordic Air  
**Выбор:** UX/UI v2 **вариант A (Forest & Linen layout)** + палитра **брендбук 50/35/15** — [`wellness-ux-v2-concepts.md`](./wellness-ux-v2-concepts.md)  
**Связано:** [`brand-rollout.md`](./brand-rollout.md) · [`apps/mobile/src/constants/theme.ts`](../apps/mobile/src/constants/theme.ts) · [`claro-gradient.ts`](../apps/mobile/src/constants/claro-gradient.ts)

> Nordic Air (`#4F8FB8`), Claro teal (`#2A9D8F`) и Earth Wellness olive остаются в git history. Production — **recognition green 50%** + **petrol 35%** + **микс 15%** на нейтральном белом холсте. Dual Calm medical blues по-прежнему запрещены.

---

## Решение

Вариант **A** задаёт характер экрана. Хроматический бюджет с брендбука:

| Доля | Swatch | Hex | Роль в UI |
|------|--------|-----|-----------|
| **50%** | Recognition green | `#7DCD72` | CTA / FAB / BrandMark / `BrandField` recognition / active tab |
| **35%** | Composition petrol | `#006F83` | `info`, заголовки-компаньоны, `BrandField` composition |
| **15%** | Mix | `#004F70` + `#FFFFFF` + green | Ink на green, `BrandPair`, иконки |
| Neutral | Canvas | `#F4F8F5` / `#FFFFFF` | `bg` / `card` |

CTA: **petrol ink на green** (`onAccent` `#004F70`). Белый на `#7DCD72` ≈ 1.8:1 — нельзя для обычного текста.

---

## Запрещённые fills (inventory)

Не использовать в `apps/mobile` UI fills (кроме banlist-тестов):

| Hex | Бывшая роль |
|-----|-------------|
| `#2563EB` / `#1D4ED8` / `#3B82F6` / `#EFF4FF` / `#DBEAFE` / `#0C4A6E` | Dual Calm medical blues |
| `#4F8FB8` / `#D9EAF5` / `#A8C9DC` / `#3A6F92` / `#7EB7D6` | Retired Nordic Air sky |

Institutional Petrol `#006F83` / `#004F70` **разрешён** — это не Dual Calm.

---

## Разрешённые исключения

| Исключение | Почему |
|------------|--------|
| `danger` / SOS `#B91C1C` | Экстренный акцент |
| `success` / `warning` traffic-light | Клинические зоны |
| `head` petrol ink | Типографика / KPI |
| Внешние тайлы карт | Не бренд-токены |

---

## Канонические токены (50 / 35 / 15)

| Token | Light | Dark | Роль |
|-------|-------|------|------|
| `bg` / `cream` | `#F4F8F5` | `#0A2F3C` | Экран |
| `card` | `#FFFFFF` | `#0E3A48` | Surface |
| `accent` | `#7DCD72` | `#7DCD72` | CTA, табы, FAB (green) |
| `onAccent` | `#004F70` | `#0A2F3C` | Ink на green |
| `accentLight` | `#E5F6E2` | `#143844` | Soft green wash |
| `accentMid` | `#7DCD72` | `#4FA86A` | Borders / selected |
| `info` / `infoLight` | `#006F83` / `#D5EEF2` | `#7EBFD0` / `#143844` | Petrol composition |
| `tipBg` / `tipBorder` / `tipText` | green wash / green / petrol | petrol family | Tip cards |
| `surfaceMuted` / `foam` | `#E8F3F0` | `#143844` | Cool mist |
| `ink` / `text` | `#0E3A48` | `#E8F7F4` | Основной текст |

Градиент `getClaroGradient(isDark)`:

- Light: `#004F70` → `#006F83` → `#7DCD72`
- Dark: `#0A2F3C` → `#006F83` → `#7DCD72`

---

## Правила (non-negotiable)

1. Нет medical Dual Calm рядом с petrol; нет возврата Nordic Air sky.
2. ~50% brand-green: онбординг-волны / `BrandField` recognition / FAB / primary fill / BrandMark.
3. ~35% petrol: `head` / `info` / текст на green / composition field.
4. ~15% микс: `BrandPair`, чипы, иконки.
5. SOS — только `danger`.
6. Ask — **extended FAB** на tab roots; icon-only на allow-list стеке; скрыт на SOS / auth / onboarding / `/ask` / setup / lock / legal.
7. Profile chrome вне `/profile` — chip иконка + имя.
8. ACTION `radii.full`; STATE `sm`/`md`; institutional fields `radii.field`.

---

## Матрица UI

| Элемент | Токен |
|---------|--------|
| Screen background | `bg` |
| Soft card / wellness | `GlassCard variant="soft"` → green wash |
| Brand hero | `BrandField` recognition / composition |
| 15% mark | `BrandPair` |
| Tab pill (floating) | `card` + `border`; active slot `accentLight` |
| Onboarding waves | accentLight + accent + info |
| H1, KPI | `head` / display type |
| Primary CTA / FAB | `accent` (green) + `onAccent` (petrol) |
| Info / cool hint | `info` / `infoLight` |

---

## Фазы

| # | Содержание | Статус |
|---|------------|--------|
| **v2-B** | Nordic Air (superseded) | ↩️ |
| **v2-A-earth olive** | Olive primary | ↩️ |
| **v2-A brandbook 50/35/15** | Green + petrol + white | ✅ |

Спека: [`wellness-ux-v2-concepts.md`](./wellness-ux-v2-concepts.md) · HTML [`wellness-ux-v2-concepts.html`](./wellness-ux-v2-concepts.html).
