import { isHttpUrl, looksLikePrescriptionText } from '@allerguide/core';
import type { ParsedFeedOffer } from './yandex-yml-parser';

const ITEM_BLOCK = /<(?:item|offer|product)\b[^>]*>([\s\S]*?)<\/(?:item|offer|product)>/gi;

export function parsePharmacyFeed(raw: string): ParsedFeedOffer[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parsePharmacyJson(trimmed);
  }
  return parsePharmacyXml(trimmed);
}

function parsePharmacyJson(raw: string): ParsedFeedOffer[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : [];

  return items
    .map((item) => normalizePharmacyRecord(item))
    .filter((item): item is ParsedFeedOffer => item != null);
}

function parsePharmacyXml(xml: string): ParsedFeedOffer[] {
  const offers: ParsedFeedOffer[] = [];
  for (const match of xml.matchAll(ITEM_BLOCK)) {
    const inner = match[1] ?? '';
    const record = normalizePharmacyRecord({
      id: xmlTag(inner, 'id') || xmlTag(inner, 'sku') || xmlTag(inner, 'offer_id'),
      name: xmlTag(inner, 'name') || xmlTag(inner, 'title'),
      url: xmlTag(inner, 'url') || xmlTag(inner, 'link'),
      picture: xmlTag(inner, 'picture') || xmlTag(inner, 'image') || xmlTag(inner, 'image_url'),
      price: xmlTag(inner, 'price'),
      category: xmlTag(inner, 'category') || xmlTag(inner, 'categoryId'),
      description: xmlTag(inner, 'description'),
    });
    if (record) offers.push(record);
  }
  return offers;
}

function normalizePharmacyRecord(raw: unknown): ParsedFeedOffer | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const title = stringField(record, ['name', 'title', 'product_name']);
  const url = stringField(record, ['url', 'link', 'deeplink']);
  const imageUrl = stringField(record, ['picture', 'image', 'image_url', 'picture_url']);
  const sku = stringField(record, ['id', 'sku', 'offer_id', 'article']) || slugFromTitle(title);
  const description = stringField(record, ['description', 'desc']);
  const categoryHint = stringField(record, ['category', 'categoryId', 'category_id']);
  const priceRub = numberField(record, ['price', 'price_rub']);

  if (!sku || !title || !isHttpUrl(url) || !isHttpUrl(imageUrl)) return null;

  return {
    sku,
    title,
    url,
    imageUrl,
    priceRub,
    categoryHint,
    description,
    prescriptionHint:
      looksLikePrescriptionText(`${title} ${description} ${categoryHint}`) ||
      booleanField(record, ['prescription', 'prescription_only', 'rx']),
  };
}

function xmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return (match?.[1] ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .trim();
}

function stringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function numberField(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return undefined;
}

function booleanField(record: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const value = record[key];
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
  }
  return false;
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
