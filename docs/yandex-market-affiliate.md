# Яндекс.Маркет — партнёрский контур A-Claro

Runbook для расширения кураторского маркета через **реферальную программу** Яндекс.Маркета (P5.5 / YM-A…D).

## Вердикт

Маркет подключается как **RU deep-link / affiliate-канал**, а не как живой каталог всего ассортимента. Фильтр аллергенов профиля всегда строится на кураторских `containsAllergens` в `@allerguide/core` — **не** на данных API Маркета.

## YM-A — Регистрация (блокер продакшн-атрибуции)

1. Зарегистрировать площадку A-Claro / AllerGuide в [Яндекс Дистрибуции](https://yandex.ru/support/market-distr/).
2. Получить `clid` (отдельно для партнёрских ссылок и артикулов, если кабинет разделяет типы).
3. Выпустить OAuth / ключ Content API для [Affiliate API](https://yandex.ru/dev/market/affiliate/ru/).
4. Создать креативы и зафиксировать `erid` (маркировка рекламы).
5. Прописать секреты **только на API** (не в `EXPO_PUBLIC_*`):

| Env | Назначение |
|-----|------------|
| `YANDEX_MARKET_CLID` | Идентификатор партнёра |
| `YANDEX_MARKET_OAUTH_TOKEN` | `Authorization: OAuth …` |
| `YANDEX_MARKET_ERID` | Опциональный erid для static fallback URL |
| `YANDEX_MARKET_API_BASE` | Override базы (по умолчанию `…/v3/affiliate`) |
| `YANDEX_MARKET_CURATOR_SEARCH` | `true` только для кураторского draft-search |

Без `CLID` + OAuth приложение всё равно открывает **seed deep-link** на `market.yandex.ru` (source=`static`).

## YM-B — Кураторский каталог

- Модель: `MarketOffer` + `CatalogProduct.offers` в `packages/core`.
- Seed: ≥5 SKU с `merchant: 'yandex_market'` (поиск/карточка Маркета).
- UI: CTA «Купить на Яндекс Маркете»; analytics `market_click` с `merchant=yandex_market`.

### Как добавить SKU

1. Подобрать товар / поисковый URL на `market.yandex.ru`.
2. Проставить `containsAllergens` / `forAllergens` вручную (или по этикетке).
3. Добавить offer:

```ts
{
  merchant: 'yandex_market',
  url: 'https://market.yandex.ru/…',
  sku: 'optional-marketArticle',
  erid: 'optional-after-creative',
}
```

4. После одобрения Дистрибуции — один раз вызвать resolve (ниже), чтобы обновить URL/цену/фото.

## YM-C — Серверный resolve

`POST /api/market/offers/yandex/resolve`

Body (достаточно одного поля):

```json
{ "productId": "air-purifier" }
{ "marketUrl": "https://market.yandex.ru/…" }
{ "marketArticle": "5828126315" }
```

Поведение:

1. Cache hit (TTL 7d) → `source: cache`
2. Если настроены секреты → `GET …/partner/link/create` (по URL) или `POST …/partner/article/create`
3. Иначе / при ошибке API → static URL (+ `clid`/`erid` query при наличии) → `source: static|fallback`

Mobile: `apps/mobile/src/services/market-api.ts` вызывает resolve перед `Linking.openURL`; при офлайне открывает seed.

Также: `GET /api/market/catalog` — seed-каталог + флаг `yandexConfigured`.

## YM-D — Draft search (не для пользователей)

`GET /api/market/offers/yandex/draft-search?q=…` — **503**, пока `YANDEX_MARKET_CURATOR_SEARCH!=true`.

Ответ помечает `allergenCurated: false`. Сырую выдачу **запрещено** показывать как «безопасные товары».

## Критерии пилота

- [ ] ≥5 курированных товаров с CTA на Маркет
- [ ] `market_click` с `merchant=yandex_market`
- [ ] Фильтр профиля не зависит от данных Маркета
- [ ] Offline: каталог из seed; CTA может требовать сеть
- [ ] Секреты только на API

## Ссылки

- [Affiliate API](https://yandex.ru/dev/market/affiliate/ru/)
- [Создание партнёрских ссылок](https://yandex.ru/support/market-distr/ru/partner-links/partner-links-create)
- Код: `apps/api/src/services/yandex-market-affiliate.ts`, `packages/core/src/market-offers.ts`
