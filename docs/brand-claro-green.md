# Claro Green — политика цвета (Фаза 0)

**Статус:** канон · supersedes Dual Calm (`brand-dual-calm.md` → redirect)  
**Связано:** [`brand-rollout.md`](./brand-rollout.md) · [`apps/mobile/src/constants/theme.ts`](../apps/mobile/src/constants/theme.ts) · [`claro-gradient.ts`](../apps/mobile/src/constants/claro-gradient.ts) · Figma handoff [`figma-handoff.md`](./figma-handoff.md)

**Синк с Figma (2026-09-18):** light-токены и композиция zip (`code.txt` / `code-2` / `code-3`) для `screens-flow-map`. Типографика: **Work Sans**. `textSecondary` / `textMuted` light = zip `#6B7C75` (документированное AA-исключение, без сдвига в `#5F716B`).

---

## Решение

Уходим от **синего света** (Medical Calm / Dual Calm). Product + ambient + info — **одна sage/teal семья** из Figma dashboard. Имена `calm.*` в коде сняты (Фаза 4); в UI — `accent*` / `tip*` / `GlassCard variant="soft"`.

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
| `danger` / SOS `#E53E3E` | Экстренный акцент (Figma SOS pill / tab) |
| `success` `#10B981` / `warning` `#F59E0B` | Traffic-light зоны колец и KPI (zip) |
| `head` charcoal `#2C3531` | Типографика / KPI — не navy Dual Calm |
| `textSecondary` `#6B7C75` | Zip muted; AA exception on `#FDFBF9` / `#FFFFFF` |
| `ringAllergen` `#EF4444` / `ringMedicine` `#F59E0B` | Zip dashboard rings |
| Внешние тайлы карт (Google / Yandex) | Не бренд-токены |
| Store / monogram на accent | Уже Claro |

---

## Канонические токены (light = Figma dashboard)

| Token | Light (Figma) | Dark | Роль |
|-------|---------------|------|------|
| `bg` / `cream` | `#FDFBF9` | `#0F1613` | Screen background |
| `card` | `#FFFFFF` | `#161D1A` | Карточки |
| `accent` | `#5B8C7A` | `#7BAF9A` | CTA, табы, brand mark, info |
| `accentLight` | `#EAF2EA` | `#1A2E28` | Soft surfaces, risk-card, tip bg |
| `accentMid` | `#B8CFC4` | `#5B8C7A` | Soft borders (derived mid) |
| `mint` | `#E4EBE4` | — | Ring tracks |
| `head` / `text` | `#2C3531` | `#E8EDE9` / `#F4F7F5` | Заголовки и body |
| `textMuted` / `textSecondary` | `#6B7C75`† | `#8A9892` / `#A8B5AF` | Вторичный текст |
| `border` | `#E2E8F0` | `#2C3A35` | Nav / card stroke |
| `success` | `#10B981` | `#34D399` | Ring fill / chart safe |
| `green` / `scannerSafeText` | `#047857`‡ | `#34D399` | Calm-zone / scanner copy on light fills |
| `warning` | `#F59E0B` | `#FBBF24` | Zip warning / mild |
| `danger` | `#E53E3E` | `#F87171` | SOS |
| `purple` | `#5D5FEF` | `#818CF8` | Legacy auth accent (zip login is email-only) |
| `surfaceDark` | `#D1DED1` | `#24302B` | Scanner cam / inactive dots |
| `ringAllergen` | `#EF4444` | `#F87171` | Outer ring |
| `ringMedicine` | `#F59E0B` | `#FBBF24` | Mid ring |
| `tipText` | `#3D6B5C` | `#B8CFC4` | Tip copy / gradient deep |
| `info` / `infoLight` | = accent / accentLight | | Семантика «подсказка» |
| `tipBg` / `tipBorder` | = accentLight / accentMid | | Tip cards |

† Zip muted `#6B7C75` ниже AA 4.5:1 на `#FDFBF9` / `#FFFFFF` — оставляем hex zip, без сдвига в `#5F716B`.  
‡ Figma ring fill `#10B981` fails AA on `successLight`; zone/scanner text uses darker emerald `#047857`.

**Radii (zip `code-3.txt`):** `sm` 6 · `md` 8 · `lg` 12 · `xl` 16 · `xxl` 24 · `full` 999. CTA высота 48, `borderRadius: radii.lg` (12). Chips diary/allergens — `radii.full`. Cards — `radii.xl` (16). Tab bar 86 (ряд 52 + home indicator 34).

Градиент `getClaroGradient(isDark)`:

- Light: `#3D6B5C` → `#5B8C7A` → `#B8CFC4`
- Dark: `#0B1612` → `#1A2E28` → `#5B8C7A`

---

## Правила (non-negotiable)

1. Нет второго «медицинского» hue рядом с accent.
2. Soft wellness surfaces — `accentLight` / `accentMid` или `GlassCard variant="soft"`.
3. SOS — только `danger`.
4. Новые hex — только через `theme.ts` + этот файл; не литералы в экранах.
5. Запрещённые написания бренда — [`brand-rollout.md`](./brand-rollout.md).

---

## Матрица UI

| Элемент | Токен |
|---------|--------|
| Screen background | `bg` |
| Soft card / wellness | `GlassCard variant="soft"` → accentLight/Mid |
| Tab active | `accent` |
| H1, KPI score | `head` |
| Primary CTA / links | `accent` |
| Tip / clinical hint | `tip*` или `info*` |
| Safe scan / scanner ring | `success` |
| Diary / moderate | `warning` |
| SOS | `danger` |

---

## Atmosphere hex (N10)

Декоративный wash / plume **рядом с компонентом**, не в `theme.ts`. Текст, кнопки, табы, SOS, вердикт — только `ThemeColors`.

| Hex / rgba | Где | Роль |
|------------|-----|------|
| `#DCEEE4` | reading wash (light), EmptyState glow | foam green, mockup `--wash-a` |
| `#F7F1E6` | reading wash warm (light) | paper warm, mockup `--wash-b` |
| `#1A3A32` | reading wash (dark) | teal foam on dark bg |
| `rgba(0,0,0,0.45)` | pollen plume caption | map overlay, not a CTA |

`check:design-tokens` allowlist: `atmosphereHex` на этих файлах. Dual Calm banlist жив.

---

## Roadmap

| Фаза | Содержание | Статус |
|------|------------|--------|
| **0** | Политика + inventory banlist (этот файл) | ✅ |
| **1** | Токены calm/info → teal | ✅ |
| **2** | UI sweep на accent*/tip* | ✅ |
| **3** | Онбординг map/sos арты | ✅ |
| **4** | Rename API: `claro-gradient`, `GlassCard soft`, удаление `calm*` | ✅ |
| **5** | Figma Make zip apply (Work Sans, zip radii, 5 peer tabs) | ✅ 2026-09-18 |

---

## Ссылки

- Brand kit: [`brand/brand-preview.html`](./brand/brand-preview.html)
- Токены: [`theme.ts`](../apps/mobile/src/constants/theme.ts)
- Градиент: [`claro-gradient.ts`](../apps/mobile/src/constants/claro-gradient.ts)
- Figma: zip `screens-flow-map` · handoff [`figma-handoff.md`](./figma-handoff.md)
