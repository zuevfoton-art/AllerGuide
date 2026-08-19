import { describe, expect, it } from 'vitest';
import { parsePharmacyFeed } from './pharmacy-feed-parser';
import { toPharmacyDraft } from './normalize-offer';

const SAMPLE_JSON = JSON.stringify([
  {
    id: 'cet-10',
    name: 'Цетиризин 10 мг',
    url: 'https://zdravcity.ru/p_cetirizin/',
    picture: 'https://cdn.zdravcity.ru/cetirizin.png',
    price: 199,
    prescription: false,
  },
  {
    id: 'rx-9',
    name: 'Рецептурный препарат',
    url: 'https://zdravcity.ru/p_rx/',
    picture: 'https://cdn.zdravcity.ru/rx.png',
    prescription: true,
  },
  {
    id: 'broken',
    name: 'Без фото',
    url: 'https://zdravcity.ru/p_broken/',
  },
]);

describe('pharmacy feed parser', () => {
  it('parses Admitad-style JSON and drops incomplete rows', () => {
    const offers = parsePharmacyFeed(SAMPLE_JSON);
    expect(offers.map((offer) => offer.sku)).toEqual(['cet-10', 'rx-9']);
    expect(offers[1]?.prescriptionHint).toBe(true);
  });

  it('never shows a price on pharmacy drafts', () => {
    const offer = parsePharmacyFeed(SAMPLE_JSON)[0]!;
    const draft = toPharmacyDraft(offer, '2026-08-19T00:00:00.000Z');
    expect(draft.product.showPrice).toBe(false);
    expect(draft.product.priceRub).toBeUndefined();
    expect(draft.product.kind).toBe('medicine');
  });
});
