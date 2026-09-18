# 09 Delta vs code — волны отрисовки

Таблица для page **09** в Izzy library. Пока волны 2–5 не нарисованы, строки — **ожидаемые развилки** (код оставить). После утверждения макета заполнять как [`figma-home-gap.md`](../figma-home-gap.md): «нарисовали иначе / код оставить».

Обратно в код — только через [`figma-handoff.md`](../figma-handoff.md) (композиция; handlers не выкидывать).

| Волна | Тема | Код (канон логики) | Если макет короче | Решение по умолчанию |
|-------|------|--------------------|-------------------|----------------------|
| 1 | Токены | `theme.ts` / `layout.ts` · AA `textMuted` `#5F716B`, zone `green` `#047857` | Figma dashboard muted `#6B7C75`, ring fill `#10B981` на тексте | **Код AA** побеждает текст; fill колец = `success` |
| 1 | Радиусы | ACTION `full`; STATE `sm`/`md`/`card` 12/16/20 | Пилюля на чипе | **Код** — чип не `full` |
| 2 | Сегодня | rings + week-ring + factors-тапы + insights + expert + disclaimer | короткий `3328:137` | **Код** — полный home |
| 2 | Оси колец | пыльца / воздух / дневник | «Симпт./Сканер» | **Код** |
| 2 | SOS без профиля | CTA 103 | EmptyState-блокер | **Код** |
| 2 | Offline | ядро работает | ErrorState | **Код** — offline ≠ error |
| 2 | IA | 4 таба + SOS control | маркет 5-й/6-й таб | **Код** — маркет из хаба |
| 3 | Settings backup | кнопки в ряд | вертикальный стек | **Код** |
| 3 | `/sos-edit` | только из профиля | карандаш на вкладке SOS | **Код** |
| 4 | Wizard | 11 шагов, stop after allergens | один экран аллергенов | **Код** — progressive profiling |
| 5 | АСИТ | только pollinosis | всегда в журнале | **Код** / CJM |
| 5 | Шкалы на Главной-copy | запрет FR-HOME-10 | ACT в рекомендациях | **Код** |

Пилот home уже разобран: [`figma-home-gap.md`](../figma-home-gap.md). Табы: [`figma-diary-gap.md`](../figma-diary-gap.md) · [`figma-scanner-gap.md`](../figma-scanner-gap.md) · [`figma-map-gap.md`](../figma-map-gap.md) · [`figma-sos-gap.md`](../figma-sos-gap.md) · [`figma-auth-gap.md`](../figma-auth-gap.md).
