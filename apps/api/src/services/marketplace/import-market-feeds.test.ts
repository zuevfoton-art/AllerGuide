import { describe, expect, it } from 'vitest';
import { importPharmacyFeed, importYandexMarketFeed } from './import-market-feeds';

const YML = `
<yml_catalog>
  <shop>
    <offers>
      <offer id="hepa-1">
        <name>Очиститель воздуха HEPA</name>
        <url>https://market.yandex.ru/card/hepa</url>
        <price>12990</price>
        <picture>https://avatars.mds.yandex.net/get-mpic/demo/300x300</picture>
      </offer>
    </offers>
  </shop>
</yml_catalog>
`;

describe('market feed import', () => {
  it('imports a Yandex YML fixture without persisting when xml is passed', async () => {
    const stats = await importYandexMarketFeed(YML);
    expect(stats.provider).toBe('yandex_market');
    expect(stats.fetched).toBe(1);
    expect(stats.imported).toBe(1);
    expect(stats.persisted).toBe(false);
  });

  it('skips prescription pharmacy rows and never persists inline fixtures', async () => {
    const stats = await importPharmacyFeed(
      JSON.stringify([
        {
          id: 'cet-10',
          name: 'Цетиризин 10 мг',
          url: 'https://zdravcity.ru/p_cetirizin/',
          picture: 'https://cdn.zdravcity.ru/cetirizin.png',
        },
        {
          id: 'rx-9',
          name: 'Препарат по рецепту',
          url: 'https://zdravcity.ru/p_rx/',
          picture: 'https://cdn.zdravcity.ru/rx.png',
          prescription: true,
        },
      ]),
    );
    expect(stats.fetched).toBe(2);
    expect(stats.imported).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.persisted).toBe(false);
  });
});
