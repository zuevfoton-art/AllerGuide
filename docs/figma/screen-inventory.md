# Screen inventory — код → Figma

Снято с `apps/mobile/app/**` × [FR §19](../functional-requirements.md) × [`design-mockup.html`](../design-mockup.html) × Izzy `screens-flow-map` `3328:11`.  
**Логика = код.** Figma рисует видимый исход, не формулы GINA/ACT/ARIA и не SQL.

Источник IA: **FR-UX-04** + [`(tabs)/_layout.tsx`](../../apps/mobile/app/(tabs)/_layout.tsx).

- 4 вкладки: Сегодня / Журнал / Скан / Карта
- SOS — **аварийный control** (`danger`, ≥44 pt), не пятый равный таб; доступен без профиля
- Маркет — `/market` из хаба профиля, **не** вкладка

Состояния на продуктовом фрейме, где применимо: **default · empty · offline · no-profile · dark**.  
`Skeleton` — один типовой фрейм в library (page 02), не на каждый маршрут.

Commit съёма базы: `05569d1c` (`main` на момент пакета).

## FR §19 × маршруты

| Экран (FR §19) | Маршрут | FR | Волна | Figma сейчас | HTML | Обязательные состояния | Не упрощать |
|----------------|---------|----|-------|--------------|------|------------------------|-------------|
| Вход | `/login` | FR-AUTH-01…05 | 4 | `3328:12` | `#screen-login` | default, error | phone/email tabs |
| Регистрация | `/register` | FR-AUTH-01…03 | 4 | нет | `#screen-register` | default, error | |
| Intro | `/onboarding-intro` | FR-ONB-01…02 | 4 | `3328:50` | `#screen-onboarding-intro` | | Skip / Next · 5 слайдов |
| Сценарий | `/onboarding` | FR-ONB-03…04 | 4 | mix `3328:79` | `#screen-onboarding` | | self / child / both |
| Создание профиля | `/profile-setup` | FR-PROF-01…05, 03a, 09…11, 18…21 | 4 | allergen step only | `#screen-profile-setup` | required vs deferred | шаги `name→contacts`; first-run stop after `allergens` |
| Главная | `/(tabs)/home` | FR-HOME-01…10, FR-ONB-07…08 | 2 | `3328:137` **короткий** | `#screen-home` + empty/offline | empty factors, offline, no-profile | оси пыльца/воздух/дневник; week-ring; insights; expert; факторы-тапы; status sheet |
| Дневник | `/(tabs)/diary` | FR-DIARY-01…07, 13…19 | 2 | `3328:214` | `#screen-diary` + picker/editor | empty feed, no-profile | CTA «Новая запись» / «Настроить курс» / отчёт; capabilities-gating секций |
| Клинические оценки | `/clinical-scales` | FR-DIARY-14 | 5 | нет | `#screen-clinical-scales` | no-profile, gated | ACT/ARIA/GINA **не** в copy Главной (FR-HOME-10) |
| Отчёт для врача | `/doctor-report` | FR-DIARY-08…12 | 5 | нет | `#screen-doctor-report` | empty period | блоки по профилю, не все сразу |
| Сканер | `/(tabs)/scanner` | FR-SCAN-01…10 | 2 | `3328:280` | `#screen-scanner` | empty verdict, offline | вердикт Safe/Caution/Avoid **первым** |
| Маркет | `/market` | FR-MARKET-01…05 | 3 | нет | `#screen-market` | empty, flag-off | **не таб** |
| Карта | `/(tabs)/map` | FR-MAP-01…10 | 2 | `3328:333` | `#screen-map` | offline tiles | `?layer=pollen\|air` |
| Эксперт | `/expert` | FR-EXP-01…04 | 3 | нет | `#screen-expert` | | вход с Главной и из хаба |
| SOS | `/(tabs)/sos` | FR-SOS-01…05, 07…09 | 2 | `3328:396` | `#screen-sos` | **no-profile = звонок 103** | read-only паспорт; правки не с вкладки |
| Редактирование SOS | `/sos-edit` | FR-SOS-06 | 3 | нет | `#screen-sos-edit` | | только из `/profile` |
| Профили | `/profiles` | FR-PROF-05…08, FR-AUTH-06 | 3 | нет | `#screen-profiles` | empty list | удаление аккаунта здесь |
| Редактирование профиля | `/profile-edit` | FR-PROF-06 | 3 | нет | `#screen-profile-edit` | | |
| Настройки | `/settings` | FR-SET-01…07 | 3 | нет | `#screen-settings` | | backup кнопки **в ряд** |

## Маршруты в коде вне §19 (волна 3–5)

| Маршрут | Волна | HTML | Заметка |
|---------|-------|------|---------|
| `/ask` | 3 | `#screen-ask` | IME над composer; не SOS |
| `/profile` | 3 | `#screen-profile` | хаб (аватар → сюда) |
| `/notifications` | 3 | `#screen-notifications` | |
| `/forgot-password` `/reset-password` | 4 | `#screen-forgot-password` | |
| `/prescribed-therapy` | 5 | `#screen-therapy` | gating профиля |
| `/asit-course` | 5 | `#screen-asit` | **только** explicit pollinosis (FR-PROF-11) |
| `/asthma-action-plan` | 5 | `#screen-asthma-plan` | астма |
| `/insect-action-plan` | 5 | `#screen-insect-plan` | insect |
| `/food-drug-registry` | 5 | `#screen-food-drug` | food/drug focus |
| `/about` `/legal/privacy` `/legal/terms` | 4 | skip kit | `ScreenBackBrandHeader` |
| `/` (`index`) | — | skip | bootstrap redirect |

## Дыры Figma vs код

**`3328:137` (Сегодня) короче продукта:** нет week-ring, factor rows (`home-factor-pollen|air|diary|clinical`), insights (`home-insights`), expert-hub, status sheet чисел, disclaimer. **Не копировать короткий dashboard как «всю главную».**

Прочие табы (`3328:214/280/333/396`) — визуальный каркас; gating, offline и SOS-без-профиля дорисовать по стикерам [`screen-specs.md`](./screen-specs.md).

## HTML-зеркало после этого пакета

Закрыто относительно предыдущей витрины: таббар 4+SOS (маркет не вкладка); register, ask, clinical-scales, sos-empty, sos-edit, settings, therapy, asit, profiles, forgot-password, action-plans, home-empty/offline, insights+expert на Сегодня.

Юридические `/legal/*` и `/about` в kit не рисуем — юридический header из page 02.
