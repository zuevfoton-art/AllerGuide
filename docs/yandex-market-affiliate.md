# Яндекс.Маркет и аптечный каталог — партнёрский контур A-Claro

Runbook для экрана «Маркет»: официальный товарный фид Яндекс Дистрибуции + курируемые OTC-карточки аптеки (Здравсити / Admitad).

## Вердикт

- **Яндекс Маркет** — основной источник SKU. Каталог строится из [товарного фида Дистрибуции](https://yandex.ru/support/market-distr/ru/product-feed) (YML, обновление каждые 6–7 часов) и `POST /partner/article/create` / `GET /partner/link/create` для партнёрских ссылок.
- **Affiliate `GET /search` снят 22.06.2026.** Не использовать для пользовательского каталога. `GET /api/market/offers/yandex/draft-search` остаётся 503 (или 410, если флаг включён).
- **Лекарства** — отдельный аптечный фид (Admitad / Здравсити). В MVP только прошедшие модерацию безрецептурные позиции. Рецептурные SKU, цена лекарства и терапевтические обещания запрещены.
- Фильтр аллергенов профиля всегда строится на курированных `containsAllergenIds` в `@allerguide/core` — **не** на сырых полях фида. Импорт создаёт `draft`; `published` только после ручной модерации.

## YM-A — Регистрация (блокер продакшн-атрибуции)

1. Зарегистрировать площадку A-Claro / AllerGuide в [Яндекс Дистрибуции](https://yandex.ru/support/market-distr/).
2. Получить `clid` и доступ к product feed.
3. Выпустить OAuth / ключ Content API для [Affiliate API](https://yandex.ru/dev/market/affiliate/ru/).
4. Создать креативы и зафиксировать `erid` (маркировка рекламы).
5. Прописать секреты **только на API** (не в `EXPO_PUBLIC_*`):

| Env | Назначение |
|-----|------------|
| `YANDEX_MARKET_CLID` | Идентификатор партнёра |
| `YANDEX_MARKET_OAUTH_TOKEN` | `Authorization: OAuth …` |
| `YANDEX_MARKET_ERID` | Опциональный erid для static fallback URL |
| `YANDEX_MARKET_API_BASE` | Override базы (по умолчанию `…/v3/affiliate`) |
| `YANDEX_MARKET_FEED_URL` | HTTPS URL официального YML-фида |
| `YANDEX_MARKET_CURATOR_SEARCH` | Оставить `false`. Live search больше не поддерживается |
| `MARKET_PHARMACY_FEED_ENABLED` | `true` только после Admitad + legal review |
| `MARKET_PHARMACY_FEED_URL` | HTTPS URL аптечного фида |

Без `CLID` + OAuth приложение всё равно открывает **seed deep-link** на `market.yandex.ru` (source=`static`).

Staging Lockbox (`aclearo-staging-api-env`): `pnpm yc-stage-enable-market-feeds` мержит URL фидов и (опционально) `clid` / OAuth / `erid`, затем перемонтирует Serverless revision. Ключи перечислены в [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys). Значения **не** коммитить. После mount: на VPC runner `pnpm --filter api db:import-market` — импорт пишет `draft`; `published` только после модерации `containsAllergenIds`.

## YM-B — Нормализованный каталог

- Домен: `MarketplaceProduct` / `MarketplaceOffer` в `packages/core/src/marketplace-catalog.ts`.
- Postgres: `catalog.market_products` + `catalog.market_offers` (не смешивать с barcode `catalog.products` и `catalog.medicines`).
- Импорт: `pnpm --filter api db:import-market` — Yandex YML + аптечный JSON/XML. Published-записи обновляют цену/фото/URL, но **не** затирают ручные `containsAllergenIds` / `forAllergenIds`.
- Seed: ≥5 Yandex SKU + OTC-аптека с фото. Bundled seed — аварийный offline fallback.

### Как опубликовать SKU

1. Дождаться импорта (`moderation_status=draft`) или добавить seed.
2. Проставить `containsAllergenIds` / `forAllergenIds` вручную.
3. Для лекарств: только OTC, `showPrice=false`, обязательный disclaimer.
4. Сменить статус на `published`.

## YM-C — API

`GET /api/market/catalog` — пагинированный published-каталог (`db` или `seed`). Профиль на сервер **не** отправляется.

`GET /api/market/health` — freshness, feed flags, без секретов.

`POST /api/market/offers/yandex/resolve`

```json
{ "productId": "air-purifier" }
{ "marketUrl": "https://market.yandex.ru/…" }
{ "marketArticle": "5828126315" }
```

Поведение: cache (TTL 7d) → partner API → static URL (+ `clid`/`erid`). Mobile: `market-api.ts` резолвит перед `Linking.openURL`; офлайн открывает seed.

## YM-D — Draft search (не для пользователей)

`GET /api/market/offers/yandex/draft-search?q=…` — **503**, пока флаг выключен; при включённом флаге **410** (Affiliate search снят). Сырую выдачу **запрещено** показывать как «безопасные товары».

## Mobile

- Флаги: `EXPO_PUBLIC_MARKET_LIVE_CATALOG` и `EXPO_PUBLIC_MARKET_MEDICINES` (default on; `false`/`off` выключает).
- Цепочка: online snapshot → last-good SQLite/IndexedDB → bundled seed.
- UI: две карточки в ряд, фото сверху, фильтры Все / Воздух / Кожа / Дом / Питание / SOS / Аптека.
- Analytics: `market_click`, `market_impression`, `market_catalog_refresh` — без аллергий и профиля.

## Критерии пилота

- [ ] ≥5 курированных товаров с CTA на Маркет
- [ ] OTC-аптека с disclaimer, без цены и без рецептурных SKU
- [ ] `market_click` с `merchant` / `product_kind` / `provider`
- [ ] Фильтр профиля не зависит от данных Маркета
- [ ] Offline: last-good snapshot или seed; CTA может требовать сеть
- [ ] Секреты и feed URL только на API
- [ ] Источник включается только после partner approval + legal/compliance review

## Ссылки

- [Товарный фид Дистрибуции](https://yandex.ru/support/market-distr/ru/product-feed)
- [Affiliate API](https://yandex.ru/dev/market/affiliate/ru/)
- [Создание партнёрских ссылок](https://yandex.ru/support/market-distr/ru/partner-links/partner-links-create)
- Код: `apps/api/src/services/marketplace/`, `packages/core/src/marketplace-catalog.ts`, `apps/mobile/src/services/market-catalog-cache-service.ts`
