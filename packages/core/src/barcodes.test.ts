import { describe, expect, it } from 'vitest';
import {
  extractGtinFromScan,
  extractNonBarcodeLabel,
  gtin14ToLookupCode,
  isValidBarcode,
  normalizeBarcode,
  SCAN_BARCODE_SYMBOLOGIES,
} from './barcodes';

describe('barcodes', () => {
  it('normalizes barcode digits', () => {
    expect(normalizeBarcode('4607025392138')).toBe('4607025392138');
    expect(normalizeBarcode('4607 0253 92138')).toBe('4607025392138');
    expect(normalizeBarcode('123')).toBe('');
  });

  it('validates barcode length', () => {
    expect(isValidBarcode('4607025392138')).toBe(true);
    expect(isValidBarcode('123')).toBe(false);
  });

  it('drops the GTIN-14 packaging indicator 0 to get EAN-13', () => {
    expect(gtin14ToLookupCode('04607025392138')).toBe('4607025392138');
    expect(gtin14ToLookupCode('14607025392138')).toBe('14607025392138');
  });

  it('extracts EAN-13, GTIN-14, GS1 AI 01 and Digital Link payloads', () => {
    expect(extractGtinFromScan('4607025392138')).toBe('4607025392138');
    expect(extractGtinFromScan('04607025392138')).toBe('4607025392138');
    expect(extractGtinFromScan('(01)04607025392138')).toBe('4607025392138');
    expect(extractGtinFromScan('010460702539213817250101')).toBe('4607025392138');
    expect(extractGtinFromScan('https://id.gs1.org/01/04607025392138')).toBe('4607025392138');
    expect(extractGtinFromScan(' 4607 0253 92138 ')).toBe('4607025392138');
    expect(extractGtinFromScan('abc')).toBe('');
  });

  it('lists camera symbologies including Data Matrix, ITF-14, Code 39 and QR', () => {
    expect(SCAN_BARCODE_SYMBOLOGIES).toEqual(
      expect.arrayContaining(['ean13', 'datamatrix', 'itf14', 'code39', 'qr']),
    );
  });

  it('keeps a human-readable label from a QR payload next to the GTIN', () => {
    expect(extractNonBarcodeLabel('(01)04607025392138')).toBe('');
    expect(extractNonBarcodeLabel('Zyrtec https://id.gs1.org/01/04607025392138')).toBe('Zyrtec');
  });
});
