# Aclearo × A-Claro — rollout checklist

**Модель:** Endorsed Product Brand — master **Aclearo**, product **A-Claro**, bundle `com.aclearo.app`.

## Digital stack (утверждено)

| Актив | Значение |
|-------|----------|
| Primary domain | `aclearo.com` |
| Product redirect | `a-claro.com` → `aclearo.com` |
| RU | `aclearo.ru`, `a-claro.ru` → один сайт |
| API (production) | `api.aclearo.com` |
| API (staging) | `api.staging.aclearo.com` |
| Web (staging) | `staging.aclearo.com` |
| Legal / Privacy | `https://aclearo.com/legal` |
| Support | `support@aclearo.com` |
| Store name | **A-Claro** |
| Store developer | **Aclearo** |
| Bundle ID | `com.aclearo.app` |

**Запрещённые написания:** `AClaro`, `aclaro.com` (pharma), `AllerClear`, `AllergoCare`.

---

## Phase 0 — Legal & domains

| # | Задача | Статус в коде | Ручное действие |
|---|--------|---------------|-----------------|
| 0.1 | Primary domain `aclearo.com` | URLs в `.env.example`, `app.json`, legal | Зарегистрировать домен, DNS |
| 0.2 | Redirect `a-claro.com` | Задокументировано | DNS 301 → aclearo.com |
| 0.3 | RU: `aclearo.ru`, `a-claro.ru` | Задокументировано | Регистрация .ru |
| 0.4 | TM: ACLEARO, A-CLARO (классы 09, 42) | — | Роспатент + USPTO/EUIPO |
| 0.5 | Privacy/Terms на `aclearo.com/legal` | `privacyPolicyUrl`, legal copy | Опубликовать страницы |
| 0.6 | Support email `support@aclearo.com` | env, eas.json, legal | Настроить почту |

---

## Phase 1 — Stores

| # | Задача | Статус в коде | Ручное действие |
|---|--------|---------------|-----------------|
| 1.1 | Bundle `com.aclearo.app` | `app.json`, Android native | App Store Connect + Play Console |
| 1.2 | Listing name **A-Claro** | `store.config.json`, `strings.xml` | Подтвердить в сторах |
| 1.3 | Developer **Aclearo** | `store.config.json` | ASC / Play developer name |
| 1.4 | Subtitle / short desc | `store.config.json` (6 локалей) | `eas metadata:push` |
| 1.5 | EAS submit profile | `eas.json` | Заполнить `ascAppId`, team IDs |

**Команды после ручной настройки ASC / Play:**

```bash
cd apps/mobile
eas metadata:push --profile production
```

---

## Phase 2 — Code (done in PR #111)

- `app.json`: name, slug, scheme, bundle
- i18n onboarding taglines (6 локалей)
- Единый header: центрированный знак + слоган «Aclearo — когда важна ясность» (`brand.slogan`, `ScreenBrandHeader`)
- Android package + Maestro `appId`

---

## Phase 3 — Visual

| # | Задача | Артефакт |
|---|--------|----------|
| 3.1 | Icon = monogram **A** | `assets/icon.png`, `BrandMark` |
| 3.2 | Accent Claro Teal `#2A9D8F` | `theme.ts`, `generate-assets.mjs` |
| 3.3 | Splash = A-Claro lockup | `assets/splash-icon.png`, `BrandLogo`, `AppSplash` |
| 3.4 | Brand SVG reference | `docs/brand/logo-mark.svg` |
| 3.5 | **Claro Green** (политика + токены; medical blue снят; `GlassCard soft`) | [`brand-claro-green.md`](./brand-claro-green.md) · `theme.ts` / `claro-gradient.ts` |

Регенерация PNG:

```bash
pnpm --filter mobile generate-assets
```

---

## Phase 4 — Comms (out of scope)

PR: «Aclearo releases A-Claro»; материалы АДАИР под Aclearo.

---

## Региональная матрица taglines

In-app slogan (`brand.slogan` / `ScreenBrandHeader`) — «Aclearo — когда важна ясность» и локализованные эквиваленты во всех 6 локалях. Ниже — onboarding taglines (отдельный ключ).

| Locale | Onboarding tagline |
|--------|-------------------|
| ru | Аллергия. Ясно. |
| en, fr, de | A for clarity. |
| es, it | Alergia. Claro. |

| Locale | Store subtitle (lead) |
|--------|----------------------|
| ru | Аллергия без тумана |
| en | See allergy clearly |
| es, it | Alergia. Claro. / Allergie, in modo chiaro |
| fr | L'allergie, en clair |
| de | Allergien klar sehen |
