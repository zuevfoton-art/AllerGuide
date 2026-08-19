import {
  isHttpUrl,
  looksLikePrescriptionText,
  type MarketplaceCategory,
} from '@allerguide/core';

export interface ParsedFeedOffer {
  sku: string;
  title: string;
  url: string;
  imageUrl: string;
  priceRub?: number;
  categoryHint: string;
  description: string;
  prescriptionHint: boolean;
}

const OFFER_BLOCK = /<offer\b[^>]*>([\s\S]*?)<\/offer>/gi;

export function parseYandexYmlFeed(xml: string): ParsedFeedOffer[] {
  if (!xml.trim()) return [];

  const offers: ParsedFeedOffer[] = [];
  for (const match of xml.matchAll(OFFER_BLOCK)) {
    const block = match[0] ?? '';
    const inner = match[1] ?? '';
    const sku = attr(block, 'id') || textTag(inner, 'vendorCode') || textTag(inner, 'shop-sku');
    const title = textTag(inner, 'name') || textTag(inner, 'model');
    const url = textTag(inner, 'url');
    const imageUrl = textTag(inner, 'picture') || textTag(inner, 'image');
    const price = parsePrice(textTag(inner, 'price'));
    const categoryHint = textTag(inner, 'categoryId') || textTag(inner, 'typePrefix');
    const description = textTag(inner, 'description');

    if (!sku || !title.trim() || !isHttpUrl(url) || !isHttpUrl(imageUrl)) continue;

    offers.push({
      sku: sku.trim(),
      title: decodeXml(title).trim(),
      url,
      imageUrl,
      priceRub: price,
      categoryHint,
      description: decodeXml(description),
      prescriptionHint: looksLikePrescriptionText(`${title} ${description} ${categoryHint}`),
    });
  }
  return offers;
}

export function guessYandexCategory(offer: ParsedFeedOffer): MarketplaceCategory {
  const haystack = `${offer.title} ${offer.description} ${offer.categoryHint}`.toLowerCase();
  if (/(аптек|лекар|антигистамин|цетиризин|лоратадин)/i.test(haystack)) return 'pharmacy';
  if (/(крем|мазь|кожа|эмолент)/i.test(haystack)) return 'skin';
  if (/(молок|паста|питан|без глютен)/i.test(haystack)) return 'food';
  if (/(чехол|автоинжектор|sos|аптечк)/i.test(haystack)) return 'sos';
  if (/(чехол|матрас|порошок|дом|постел)/i.test(haystack)) return 'home';
  if (/(очистител|увлажнител|ирригатор|воздух|пыльц)/i.test(haystack)) return 'air';
  return 'home';
}

function textTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decodeXml(match?.[1] ?? '').trim();
}

function attr(xml: string, name: string): string {
  const match = xml.match(new RegExp(`\\b${name}="([^"]+)"`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parsePrice(value: string): number | undefined {
  const parsed = Number(value.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
