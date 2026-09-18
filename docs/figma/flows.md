# 03 Flows

На каждом фрейме стикер из [`screen-specs.md`](./screen-specs.md): маршрут · FR · тап → куда · состояния · a11y 44pt · testID. Copy — RU. Пороги GINA/ACT не рисовать числами-формулами.

Флоу — **сценарии**, не карта «все экраны сразу» (page 03).

## A. Первый запуск

`/login` → `/register` (опц.) → `/onboarding-intro` (Skip|Next, 5 слайдов) → `/onboarding` (self / child / both) → `/profile-setup` → `/(tabs)/home`

Wizard steps (`PROFILE_SETUP_WIZARD_STEPS`): `name` → `birthYear` → `conditions` → `allergens` → (deferred) `crossReactions` → `allergenConfirmations` → `symptomBaseline` → `conditionHistory` → `comorbidity` → `phenotypeSummary` → `contacts`.

First-run может остановиться после required (`name`, `birthYear`, `conditions`, `allergens`) и открыть Сегодня. Остальное — progressive profiling.

## B. День

Сегодня (`/(tabs)/home`):

1. Кольца + индекс 0–100. Тап по status → sheet «числа и проценты» (FR-HOME-09). ACT/ARIA/GINA **можно** в sheet и на кольцах; **нельзя** в текстах рекомендаций (FR-HOME-10).
2. Compact «Сегодня» (reading) + чек-ин 0–3 (STATE chips 2×2).
3. Факторы-тапы: пыльца → `/map?layer=pollen`; воздух → `/map?layer=air`; дневник → журнал; оценки → `/clinical-scales`.
4. Week-ring, insights, expert-вход, disclaimer.

Не копировать короткий `screen-dashboard` (`3328:137`) как весь экран.

## C. Кризис

С любого таба → SOS control.

- Есть профиль: read-only паспорт + 103 + контакты. Правки только `/sos-edit` из `/profile`.
- **Нет профиля:** крупный CTA 103 (`tapMinHeightCrisis` 60). Не блокировать EmptyState «создайте профиль».

## D. Хаб

Аватар → `/profile` (хаб): `/profiles`, `/settings` (backup в ряд), `/market`, `/expert`, `/ask`, `/sos-edit`, выход.

Маркет не вкладка.

## E. Журнал

«Новая запись» → пикер типа (gating из [`cjm-profile-diary.md`](../cjm-profile-diary.md) / `profile-capabilities.ts`: explicit conditions, не эвристика по именам аллергенов).

«Настроить курс» → терапия / АСИТ (АСИТ только при поллинозе). «Отчёт» → `/doctor-report`.

## F. Скан

Камера / код / текст → **вердикт** Safe / Caution / Avoid первым. Состав и источник — «Подробнее». Offline: keyword/mock, не ложный «можно».

## Gating (не рисовать скрытые модули как всегда видимые)

| Capability | Когда в макете |
|------------|----------------|
| АСИТ | explicit pollinosis |
| ACT / GINA | asthma (capabilities) |
| Пищевые секции дневника | foodFocus |
| Лекарственный шаг реакции | drugFocus / SOS intolerances |
| Карта, маркет, все режимы сканера | **всегда** (FR-PROF-12) |
