export interface BarcodeProduct {
  barcode: string;
  name: string;
  ingredients: string;
  brand?: string;
  category?: string;
}

/** Symbologies passed to expo-camera `barcodeScannerSettings`. */
export const SCAN_BARCODE_SYMBOLOGIES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'datamatrix',
  'itf14',
  'code39',
  'qr',
] as const;

export type ScanBarcodeSymbology = (typeof SCAN_BARCODE_SYMBOLOGIES)[number];

export function normalizeBarcode(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 ? digits : '';
}

export function isValidBarcode(value: string): boolean {
  return normalizeBarcode(value).length >= 8;
}

/** GTIN-14 with packaging indicator 0 is the EAN-13 used in OFF / our catalog. */
export function gtin14ToLookupCode(gtin14: string): string {
  if (gtin14.length === 14 && gtin14.startsWith('0')) return gtin14.slice(1);
  return gtin14;
}

/**
 * Pull a catalog lookup code from a camera payload: GS1 AI 01, Digital Link,
 * GTIN-14, or a plain EAN/UPC digit string.
 */
export function extractGtinFromScan(raw: string): string {
  const text = raw.trim();
  if (!text) return '';

  const digitalLink = text.match(/\/01\/(\d{8,14})/);
  if (digitalLink) {
    const digits = digitalLink[1];
    return digits.length === 14 ? gtin14ToLookupCode(digits) : digits;
  }

  const parenAi = text.match(/\(01\)(\d{14})/);
  if (parenAi) return gtin14ToLookupCode(parenAi[1]);

  const compact = text.replace(/\s+/g, '');
  const concatAi = compact.match(/(?:^|[^0-9])01(\d{14})/);
  if (concatAi && compact.replace(/\D/g, '').length >= 16) {
    return gtin14ToLookupCode(concatAi[1]);
  }
  if (/^01\d{14}/.test(compact)) {
    return gtin14ToLookupCode(compact.replace(/\D/g, '').slice(2, 16));
  }

  const digits = text.replace(/\D/g, '');
  if (digits.length === 14) return gtin14ToLookupCode(digits);
  if (digits.length >= 8 && digits.length <= 13) return digits;
  return '';
}

/** Letters left in a QR / GS1 payload after the GTIN — used as a medicine name hint. */
export function extractNonBarcodeLabel(raw: string): string {
  const withoutUrl = raw.replace(/https?:\/\/\S+/gi, ' ');
  const withoutAi = withoutUrl.replace(/\(0\d\)/g, ' ').replace(/\b01\d{14}\b/g, ' ');
  const label = withoutAi
    .replace(/\d{8,}/g, ' ')
    .replace(/[^\p{L}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return label.length >= 2 ? label : '';
}
