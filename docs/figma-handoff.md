# Figma → код (handoff)

Процедура переноса макетов AllerGuide в `apps/mobile` без генерации «пиксель-в-пиксель» UI и без обхода токенов Claro.

## Источник макета

| Поле | Значение |
|------|----------|
| Файл | [Izzy's team library](https://www.figma.com/design/k0i0hCj3CPpaVvz2wMEy3A/Izzy-s-team-library) |
| Flow-map | `3328:11` ([открыть](https://www.figma.com/design/k0i0hCj3CPpaVvz2wMEy3A/Izzy-s-team-library?node-id=3328-11)) |
| HTML-зеркало | [`docs/design-mockup.html`](./design-mockup.html) |

### Screen-frame → route

| Figma node | Frame | App route | Gap |
|------------|-------|-----------|-----|
| `3328:137` | `screen-dashboard` | `/(tabs)/home` | [`figma-home-gap.md`](./figma-home-gap.md) |
| `3328:214` | `screen-diary` | `/(tabs)/diary` | [`figma-diary-gap.md`](./figma-diary-gap.md) |
| `3328:280` | `screen-scanner` | `/(tabs)/scanner` | [`figma-scanner-gap.md`](./figma-scanner-gap.md) |
| `3328:333` | `screen-map` | `/(tabs)/map` | [`figma-map-gap.md`](./figma-map-gap.md) |
| `3328:396` | `screen-sos` | `/(tabs)/sos` | [`figma-sos-gap.md`](./figma-sos-gap.md) |
| `3328:12` | `screen-login` | `/login` | [`figma-auth-gap.md`](./figma-auth-gap.md) |
| `3328:50` | `screen-onboarding` | `/onboarding-intro` | same |
| `3328:79` | `screen-profile` | `/profile-setup` (allergen step) | same |

## Конфликты макет ↔ код

| Слой | Кто побеждает |
|------|----------------|
| Цвета / радиусы | **Figma** → [`theme.ts`](../apps/mobile/src/constants/theme.ts) / [`layout.ts`](../apps/mobile/src/constants/layout.ts) + [`brand-claro-green.md`](./brand-claro-green.md); WCAG AA overrides OK |
| Визуальные компоненты / композиция | **Figma** → presentational UI в `src/components` |
| Логика, handlers, сервисы, флаги | **текущий код** — не менять поведение |
| Новый hex | Только через `theme.ts` (+ brand-doc); не литералы в `app/**` / `components/**` |

## Шаги агента / разработчика

1. **Прочитать фрейм** — MCP `figma` или REST PAT.
2. **Спека** — [`.cursor/skills/product-designer/SKILL.md`](../.cursor/skills/product-designer/SKILL.md).
3. **Токены** — fills/radii из Figma → `theme.ts` / `layout.ts`.
4. **Компоненты** — UI-блоки из Figma; экраны сшивают с существующими handlers.
5. **Код** — оркестрация в `app/**/*.tsx`; стили через `useTheme()` / `space` / `radii`.
6. **i18n** — `types.ts` + все 6 локалей.
7. **Синк mockup** — `#screen-*` в `design-mockup.html`.
8. **Гейты** — `pnpm check:design-tokens`, typecheck/lint, web smoke (те же CTA).

## Fallback без OAuth

Cloud: REST PAT. Desktop: Settings → Tools & MCP → Connect Figma.

## Связанное

- MCP: [`docs/mcp-servers.md`](./mcp-servers.md)
- Роли: [`docs/agents-roles-and-mcp-plan.md`](./agents-roles-and-mcp-plan.md)
