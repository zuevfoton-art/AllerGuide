# Figma → код (handoff)

Процедура переноса макетов AllerGuide в `apps/mobile` без вставки сгенерированных RN-файлов как новых роутов.

## Источник макета

Канон композиции — **Figma Make zip** (`code.txt`…`code-21.txt`) для `screens-flow-map`. Логика, handlers и сервисы остаются в текущем коде.

| Поле | Значение |
|------|----------|
| Источник UI | Figma Make zip (login, onboarding, profile, dashboard, diary, scanner, SOS + kit) |
| Flow-map names | `screen-login`, `screen-onboarding`, `screen-profile`, `screen-dashboard`, `screen-diary`, `screen-scanner`, `screen-map` (нет в zip), `screen-sos` |
| HTML-зеркало | [`docs/design-mockup.html`](./design-mockup.html) |

### Zip → route

| Zip | Figma name | App route | Gap |
|-----|------------|-----------|-----|
| `code-15.txt` | Dashboard | `/(tabs)/home` | [`figma-home-gap.md`](./figma-home-gap.md) |
| `code-16.txt` | Diary | `/(tabs)/diary` | [`figma-diary-gap.md`](./figma-diary-gap.md) |
| `code-17.txt` | Scanner | `/(tabs)/scanner` | [`figma-scanner-gap.md`](./figma-scanner-gap.md) |
| — | MapScreen отсутствует | `/(tabs)/map` | [`figma-map-gap.md`](./figma-map-gap.md) |
| `code-18.txt` | SOS | `/(tabs)/sos` | [`figma-sos-gap.md`](./figma-sos-gap.md) |
| `code-12.txt` | Login | `/login` | [`figma-auth-gap.md`](./figma-auth-gap.md) |
| `code-13.txt` | Onboarding | `/onboarding-intro` | same |
| `code-14.txt` | Profile chips | `/profile-setup` (allergen step) | same |
| `code.txt` / `code-2` / `code-3` | tokens | `theme.ts` / `typography.ts` / `layout.ts` | [`brand-claro-green.md`](./brand-claro-green.md) |

## Конфликты макет ↔ код

| Слой | Кто побеждает |
|------|----------------|
| Цвета / радиусы / тип | **zip** → [`theme.ts`](../apps/mobile/src/constants/theme.ts) / [`layout.ts`](../apps/mobile/src/constants/layout.ts) / [`typography.ts`](../apps/mobile/src/constants/typography.ts) |
| Визуальные компоненты / композиция | **zip** → `src/components` + существующие `app/**` |
| Логика, handlers, сервисы, флаги | **текущий код** — не менять поведение |
| Новый hex | Только через `theme.ts` (+ brand-doc); не литералы в `app/**` / `components/**` |

## Осознанные срезы продукта

Zip не содержит IA/осей продукта. Их **не восстанавливаем** на zip-кадрах:

- 4-tab IA + SOS emergency-control → **5 равных табов** Главная / Дневник / Сканер / Карта / SOS
- оси колец пыльца / воздух / дневник → **подписи и цвета zip** (Аллергены / Лекарства / Симптомы); числа остаются wellness
- phone/email tabs на логине → **email-only**
- 5 intro slides → **3 слайда** (аллергены / сканер / карта)

## Dual FAB (diary)

На `screen-diary` zip — только круглый fab 56×56. Глобальный Ask остаётся в продукте: на `/diary` `AskFabHost` поднимается на высоту FAB + зазор (`ask-fab-layout.ts`), чтобы не перекрывать «+».

## Шаги агента / разработчика

1. **Прочитать zip-кадр** — `code-*.txt`, не live-фрейм `3328:*` как канон композиции.
2. **Спека** — [`.cursor/skills/product-designer/SKILL.md`](../.cursor/skills/product-designer/SKILL.md).
3. **Токены** — fills/radii/type из zip → `theme.ts` / `layout.ts` / `typography.ts`.
4. **Компоненты** — UI-блоки из zip; экраны сшивают с существующими handlers.
5. **Код** — оркестрация в `app/**/*.tsx`; стили через `useTheme()` / `space` / `radii`.
6. **i18n** — `types.ts` + все 6 локалей.
7. **Синк mockup** — `#screen-*` в `design-mockup.html`.
8. **Гейты** — `pnpm check:design-tokens`, typecheck/lint, web smoke (те же CTA). Maestro: `diary-new-entry`, `sos-crisis-call`, scanner camera.

## Связанное

- MCP: [`docs/mcp-servers.md`](./mcp-servers.md)
- Обратный путь (код → отрисовка в Figma): [`figma-code-to-figma.md`](./figma-code-to-figma.md) · пакет [`figma/`](./figma/).
