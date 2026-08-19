import { describe, expect, it } from 'vitest';
import { parseYandexYmlFeed, guessYandexCategory } from './yandex-yml-parser';
import { shouldSkipYandexAsMedicine, toYandexDraft } from './normalize-offer';

const SAMPLE_YML = `
<yml_catalog>
  <shop>
    <offers>
      <offer id="hepa-1">
        <name>Очиститель воздуха HEPA</name>
        <url>https://market.yandex.ru/card/hepa</url>
        <price>12990</price>
        <picture>https://avatars.mds.yandex.net/get-mpic/demo/300x300</picture>
        <description>Для пыльцы</description>
      </offer>
      <offer id="rx-1">
        <name>Препарат по рецепту</name>
        <url>https://market.yandex.ru/card/rx</url>
        <price>500</price>
        <picture>https://avatars.mds.yandex.net/get-mpic/demo/rx.png</picture>
      </offer>
      <offer id="bad">
        <name>Без ссылки</name>
        <picture>not-a-url</picture>
      </offer>
    </offers>
  </shop>
</yml_catalog>
`;

describe('yandex yml parser', () => {
  it('parses valid offers and skips broken ones', () => {
    const offers = parseYandexYmlFeed(SAMPLE_YML);
    expect(offers).toHaveLength(2);
    expect(offers[0]?.sku).toBe('hepa-1');
    expect(offers[0]?.priceRub).toBe(12990);
    expect(guessYandexCategory(offers[0]!)).toBe('air');
  });

  it('skips prescription or pharmacy-looking Yandex rows', () => {
    const offers = parseYandexYmlFeed(SAMPLE_YML);
    const rx = offers.find((offer) => offer.sku === 'rx-1');
    expect(shouldSkipYandexAsMedicine(rx!)).toBe(true);
    expect(toYandexDraft(offers[0]!, '2026-08-19T00:00:00.000Z').product.provider).toBe(
      'yandex_market',
    );
  });
});
