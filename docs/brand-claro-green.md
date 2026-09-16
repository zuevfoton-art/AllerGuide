# Forest Refuge · Earth Wellness — политика цвета (UX/UI v2)

**Статус:** канон production · supersedes Nordic Air B as product accent  
**Выбор:** UX/UI v2 **вариант A (Forest & Linen layout)** + палитра **photo-3 Earth Wellness · 2B Slate primary** — [`wellness-ux-v2-concepts.md`](./wellness-ux-v2-concepts.md)  
**Связано:** [`brand-rollout.md`](./brand-rollout.md) · [`apps/mobile/src/constants/theme.ts`](../apps/mobile/src/constants/theme.ts) · [`claro-gradient.ts`](../apps/mobile/src/constants/claro-gradient.ts)

> Nordic Air (`#4F8FB8`) и Claro teal (`#2A9D8F`) остаются в git history / HTML comparison. Production — **Slate primary** на тёплом peach-linen фоне; Sage/Moss — soft surfaces. Dual Calm medical blues по-прежнему запрещены.

---

## Решение

Вариант **A** задаёт характер экрана (тёплое прибежище, крупные поверхности, выразительная иерархия). Палитра с фото 3, mapping **2B**:

| Swatch | Hex | Роль в UI |
|--------|-----|-----------|
| Accent Slate | `#829399` → CTA `#5F7076` | Primary action (deepened for white-on-accent AA) |
| Main Sage | `#A3A380` / wash `#E4E5D4` | Soft surfaces / `accentMid` / `accentLight` |
| Minor Moss | `#7F7F67` / tip `#5F5F4A` | Secondary surface / tip text |
| Main Dusty Rose | `#D8C3B6` → soft `#F3E9E2` | Secondary soft / `surfaceMuted` / `foam` |
| Neutral Stone | `#D6D2CD` | Tracks / `mint` |
| Canvas | `#F7ECE1` | `bg` / `cream` |

---

## Запрещённые fills (inventory)

Не использовать в `apps/mobile` UI fills (кроме banlist-тестов):

| Hex | Бывшая роль |
|-----|-------------|
| `#2563EB` / `#1D4ED8` / `#3B82F6` / `#EFF4FF` / `#DBEAFE` / `#0C4A6E` | Dual Calm medical blues |
| `#4F8FB8` / `#D9EAF5` / `#A8C9DC` / `#3A6F92` / `#7EB7D6` | Retired Nordic Air sky |

Проверка: `rg` по этим hex в `apps/mobile` / `docs` (исключая тесты-banlist) → пусто.

---

## Разрешённые исключения

| Исключение | Почему |
|------------|--------|
| `danger` / SOS `#B91C1C` | Экстренный акцент |
| `success` / `warning` traffic-light | Клинические зоны |
| `head` тёплый ink | Типографика / KPI |
| Внешние тайлы карт | Не бренд-токены |

---

## Канонические токены (Earth Wellness 2B)

| Token | Light | Dark | Роль |
|-------|-------|------|------|
| `bg` / `cream` | `#F7ECE1` | `#14140F` | Экран |
| `card` | `#FFFCF8` | `#1E1D1A` | Surface |
| `accent` | `#5F7076` | `#9AADB8` | CTA, табы, FAB, ссылки (Slate) |
| `accentLight` | `#E4E5D4` | `#2A2A22` | Soft Sage wash |
| `accentMid` | `#A3A380` | `#7F7F67` | Soft Sage/Moss borders |
| `info` / `infoLight` | = accent / `#E0E5E7` | = accent / `#2C333A` | Slate info |
| `tipBg` / `tipBorder` / `tipText` | Sage family | Sage/Moss family | Tip cards |
| `surfaceMuted` / `foam` | `#F3E9E2` | `#24221E` | Dusty-rose soft |
| `ink` / `text` | `#1C2624` | `#F3EDE4` | Основной текст |

Градиент `getClaroGradient(isDark)`:

- Light: `#3F4F55` → `#5F7076` → `#E0E5E7`
- Dark: `#14140F` → `#2C333A` → `#9AADB8`

---

## Правила (non-negotiable)

1. Нет второго «медицинского» hue рядом со Slate; нет возврата Dual Calm / Nordic Air sky.
2. Soft wellness — Sage `accentLight` / `accentMid` / `GlassCard variant="soft"`; dusty rose — `surfaceMuted`.
3. SOS — только `danger`.
4. Ask entry — **global FAB** на оболочке; скрыт на SOS / auth / onboarding / `/ask`.
5. Profile chrome вне `/profile` — chip иконка + имя.
6. Онбординг волны — `accent` (Slate) + `accentLight` (Sage) + `surfaceMuted` (Dusty Rose).

---

## Матрица UI

| Элемент | Токен |
|---------|--------|
| Screen background | `bg` |
| Soft card / wellness | `GlassCard variant="soft"` → Sage accentLight/Mid |
| Tab pill (floating) | `card` + `border`; active slot `accentLight` |
| Onboarding waves | accentLight + accent + surfaceMuted |
| H1, KPI | `head` / display type |
| Primary CTA / FAB | `accent` (Slate) + `onAccent` |
| Info / cool hint | `info` / `infoLight` |

---

## Фазы

| # | Содержание | Статус |
|---|------------|--------|
| **v2-B** | Nordic Air (superseded) | ↩️ |
| **v2-A-earth 2A** | Moss primary | ↩️ |
| **v2-A-earth 2B** | Slate primary + Sage/Moss surfaces | ✅ |

Спека: [`wellness-ux-v2-concepts.md`](./wellness-ux-v2-concepts.md) · HTML [`wellness-ux-v2-concepts.html`](./wellness-ux-v2-concepts.html).
