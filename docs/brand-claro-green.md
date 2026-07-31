# Claro Green — политика цвета (Фаза 0)

**Статус:** канон · supersedes Dual Calm (`brand-dual-calm.md` → redirect)  
**Связано:** [`brand-rollout.md`](./brand-rollout.md) · [`apps/mobile/src/constants/theme.ts`](../apps/mobile/src/constants/theme.ts) · [`claro-gradient.ts`](../apps/mobile/src/constants/claro-gradient.ts)

---

## Решение

Уходим от **синего света** (Medical Calm / Dual Calm). Product + ambient + info — **одна семья Claro teal**. Имена `calm.*` в коде сняты (Фаза 4); в UI — `accent*` / `tip*` / `GlassCard variant="soft"`.

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
| `danger` / SOS `#B91C1C` | Экстренный акцент (не teal) |
| `success` / `warning` traffic-light | Клинические зоны, не бренд-ambient |
| `head` navy `#1E3A5F` | Только типографика / KPI, не fill atmosphere |
| Внешние тайлы карт (Google / Yandex) | Не бренд-токены |
| Store / monogram на teal | Уже Claro |

---

## Канонические токены

| Token | Light | Dark | Роль |
|-------|-------|------|------|
| `accent` | `#2A9D8F` | `#3DB8A8` | CTA, табы, ссылки, info icon |
| `accentLight` | `#E6F6F4` | `#134E48` | Soft surfaces, tip bg |
| `accentMid` | `#9FD9D1` | `#2A9D8F` | Soft borders |
| `tipText` | `#1F6B62` | `#9FD9D1` | Tip copy / gradient deep (light) |
| `info` / `infoLight` | = accent / accentLight | | Семантика «подсказка» |
| `tipBg` / `tipBorder` | = accentLight / accentMid | | Tip cards |

Градиент `getClaroGradient(isDark)`:

- Light: `#1F6B62` → `#2A9D8F` → `#9FD9D1`
- Dark: `#0B1120` → `#134E48` → `#2A9D8F`

---

## Правила (non-negotiable)

1. Нет второго «медицинского» hue рядом с accent.
2. Soft wellness surfaces — `accentLight` / `accentMid` или `GlassCard variant="soft"`.
3. SOS — только `danger`.
4. Запрещённые написания бренда — [`brand-rollout.md`](./brand-rollout.md).

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
| Tip / clinical hint | `tip*` или `info*` |
| Safe scan | `success` |
| SOS | `danger` |

---

## Roadmap

| Фаза | Содержание | Статус |
|------|------------|--------|
| **0** | Политика + inventory banlist (этот файл) | ✅ |
| **1** | Токены calm/info → teal | ✅ |
| **2** | UI sweep на accent*/tip* | ✅ |
| **3** | Онбординг map/sos арты | ✅ |
| **4** | Rename API: `claro-gradient`, `GlassCard soft`, удаление `calm*` | ✅ |

---

## Ссылки

- Brand kit: [`brand/brand-preview.html`](./brand/brand-preview.html)
- Токены: [`theme.ts`](../apps/mobile/src/constants/theme.ts)
- Градиент: [`claro-gradient.ts`](../apps/mobile/src/constants/claro-gradient.ts)
