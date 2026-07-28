import { describe, expect, it } from 'vitest';
import {
  appendYandexPartnerParams,
  isMarketMerchant,
  merchantDisplayName,
  yandexPartnerArticleSearchUrl,
} from './market-offers';

describe('market-offers', () => {
  it('recognizes known merchants', () => {
    expect(isMarketMerchant('yandex_market')).toBe(true);
    expect(isMarketMerchant('amazon')).toBe(false);
  });

  it('labels yandex_market for RU UI', () => {
    expect(merchantDisplayName('yandex_market')).toBe('Яндекс Маркет');
  });

  it('appends clid/erid only to market.yandex.ru URLs', () => {
    const withParams = appendYandexPartnerParams(
      'https://market.yandex.ru/search?text=hepa',
      { clid: '123', erid: 'EridDemo' },
    );
    expect(withParams).toContain('clid=123');
    expect(withParams).toContain('erid=EridDemo');

    expect(
      appendYandexPartnerParams('https://www.iherb.com/search?kw=hepa', { clid: '123' }),
    ).toBe('https://www.iherb.com/search?kw=hepa');
  });

  it('builds partner-article search deep-links', () => {
    expect(yandexPartnerArticleSearchUrl('YM10469939')).toBe(
      'https://market.yandex.ru/search?text=YM10469939',
    );
  });
});
