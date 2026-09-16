# Nordic Air — политика цвета (UX/UI v2)

**Статус:** канон production · supersedes Claro Green teal as product accent  
**Выбор:** UX/UI v2 вариант **B — Nordic Air (тёплый небо)** — [`wellness-ux-v2-concepts.md`](./wellness-ux-v2-concepts.md)  
**Связано:** [`brand-rollout.md`](./brand-rollout.md) · [`apps/mobile/src/constants/theme.ts`](../apps/mobile/src/constants/theme.ts) · [`claro-gradient.ts`](../apps/mobile/src/constants/claro-gradient.ts)

> Исторический документ Claro teal (`#2A9D8F`) остаётся в git history и в сравнениях A/C макета. Production accent — тёплый голубой Nordic Air. Dual Calm medical blues по-прежнему запрещены.

---

## Решение

Уходим от **Claro teal** и от **medical calm / Dual Calm slate-blue**. Product + ambient + info — **одна семья тёплого неба (sky blue)** на тёплом льняном фоне. Имена `calm.*` в коде сняты; в UI — `accent*` / `tip*` / `GlassCard variant="soft"`.

---

## Запрещённые fills (inventory)

Не использовать в `apps/mobile` UI fills, mockups и brand kit (кроме цитат в тестах-banlist):

| Hex | Бывшая роль Dual Calm |
|-----|------------------------|
| `#2563EB` | calmMid / info |
| `#1D4ED8` | dark calmMid |
| `#3B82F6` | calmLight / dark info |
| `#EFF4FF` | calmWash / infoLight |
| `#DBEAFE` | calmMist |
| `#0C4A6E` | dark infoLight |
| `#BFDBFE` / `#93C5FD` / `#1E40AF` | legacy tip blues |

Проверка: `rg '#2563EB|#1D4ED8|#3B82F6|#EFF4FF|#DBEAFE|#0C4A6E' apps/mobile docs --glob '!**/claro-gradient.test.ts'` → пусто.

---

## Разрешённые исключения

| Исключение | Почему |
|------------|--------|
| `danger` / SOS `#B91C1C` | Экстренный акцент (не sky) |
| `success` / `warning` traffic-light | Клинические зоны, не бренд-ambient |
| `head` тёплый уголь / deep sky | Типографика / KPI, не fill atmosphere |
| Внешние тайлы карт (Google / Yandex) | Не бренд-токены |

---

## Канонические токены (Nordic Air B)

| Token | Light | Dark | Роль |
|-------|-------|------|------|
| `bg` / `cream` | `#F5F3EE` | `#121614` | Экран |
| `card` | `#FFFCF8` | `#1A2220` | Surface |
| `accent` | `#4F8FB8` | `#7EB7D6` | CTA, табы, ссылки, info icon |
| `accentLight` | `#D9EAF5` | `#243846` | Soft surfaces, tip bg |
| `accentMid` | `#A8C9DC` | `#4F8FB8` | Soft borders |
| `tipText` | `#3A6F92` | `#A8C9DC` | Tip copy / gradient deep (light) |
| `ink` / `text` | `#1C2624` | `#E8F0ED` | Основной текст |
| `info` / `infoLight` | = accent / accentLight | | Семантика «подсказка» |
| `tipBg` / `tipBorder` | = accentLight / accentMid | | Tip cards |

Градиент `getClaroGradient(isDark)` (имя файла историческое):

- Light: `#3A6F92` → `#4F8FB8` → `#D9EAF5`
- Dark: `#0E1618` → `#243846` → `#4F8FB8`

Wash reading: `#D9EAF5` → `#E8F1F6` → тёплый `#F3EDE4`.

---

## Правила (non-negotiable)

1. Нет второго «медицинского» hue рядом с accent; нет возврата Dual Calm blues.
2. Soft wellness surfaces — `accentLight` / `accentMid` или `GlassCard variant="soft"`.
3. SOS — только `danger`.
4. Запрещённые написания бренда — [`brand-rollout.md`](./brand-rollout.md).
5. Profile chrome вне `/profile` — chip иконка + имя ([`wellness-ux-v2-concepts.md`](./wellness-ux-v2-concepts.md) §2.4).

---

## Матрица UI

| Элемент | Токен |
|---------|--------|
| Screen background | `bg` |
| Soft card / wellness | `GlassCard variant="soft"` → accentLight/Mid |
| Tab pill | `accentLight` / `accentMid` |
| Onboarding waves | `accentLight` + `accent` |
| H1, KPI | `head` |
| Primary CTA / links | `accent` |
| Profile switcher chip | `accentLight` / `accentMid` + имя |

---

## Фазы

| # | Содержание | Статус |
|---|------------|--------|
| **v2-B** | Выбор Nordic Air + токены `theme.ts` / gradient | ✅ |
| Далее | SelectChip / BottomSheet / AskChatSheet / Today criticality UI | pending |

Спека сравнения A/B/C: [`wellness-ux-v2-concepts.html`](./wellness-ux-v2-concepts.html).
