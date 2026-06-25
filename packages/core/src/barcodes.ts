export interface BarcodeProduct {
  barcode: string;
  name: string;
  ingredients: string;
  brand?: string;
  category?: string;
}

export function normalizeBarcode(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 ? digits : '';
}

export function isValidBarcode(value: string): boolean {
  return normalizeBarcode(value).length >= 8;
}
