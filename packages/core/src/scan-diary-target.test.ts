import { describe, expect, it } from 'vitest';
import {
  diarySectionAnalyticsKey,
  resolveScanDiaryTarget,
  scanDiarySectionForTarget,
  scanTriggerSourceLine,
} from './scan-diary-target';

describe('resolveScanDiaryTarget', () => {
  it('routes catalog / OMF / OCR medicine signals to medicine', () => {
    expect(resolveScanDiaryTarget({ productCategory: 'medicine' })).toBe('medicine');
    expect(resolveScanDiaryTarget({ source: 'openmedicinefacts' })).toBe('medicine');
    expect(resolveScanDiaryTarget({ mode: 'medicine' })).toBe('medicine');
    expect(resolveScanDiaryTarget({ hasMedicineCatalogHit: true })).toBe('medicine');
    expect(resolveScanDiaryTarget({ hasMedicineLabelSignal: true })).toBe('medicine');
  });

  it('prefers medicine when a tablet pack is also tagged household', () => {
    expect(
      resolveScanDiaryTarget({
        productCategory: 'household',
        source: 'openproductsfacts',
        hasMedicineLabelSignal: true,
      }),
    ).toBe('medicine');
  });

  it('routes beauty and household to trigger', () => {
    expect(resolveScanDiaryTarget({ productCategory: 'beauty' })).toBe('trigger');
    expect(resolveScanDiaryTarget({ productCategory: 'household' })).toBe('trigger');
    expect(resolveScanDiaryTarget({ mode: 'cosmetics' })).toBe('trigger');
    expect(resolveScanDiaryTarget({ source: 'openbeautyfacts' })).toBe('trigger');
    expect(resolveScanDiaryTarget({ source: 'openproductsfacts' })).toBe('trigger');
  });

  it('keeps food and unknown scans as food', () => {
    expect(resolveScanDiaryTarget({ productCategory: 'food' })).toBe('food');
    expect(resolveScanDiaryTarget({ source: 'openfoodfacts' })).toBe('food');
    expect(resolveScanDiaryTarget({})).toBe('food');
  });
});

describe('scan diary section helpers', () => {
  it('maps targets onto diary section types', () => {
    expect(scanDiarySectionForTarget('food')).toBe('Питание');
    expect(scanDiarySectionForTarget('medicine')).toBe('Лекарство');
    expect(scanDiarySectionForTarget('trigger')).toBe('Триггер');
  });

  it('emits non-PII analytics keys', () => {
    expect(diarySectionAnalyticsKey('Питание')).toBe('food');
    expect(diarySectionAnalyticsKey('Лекарство')).toBe('medicine');
    expect(diarySectionAnalyticsKey('Триггер')).toBe('trigger');
  });

  it('labels cosmetics vs household trigger context', () => {
    expect(scanTriggerSourceLine({ productCategory: 'beauty' })).toBe('Сканер · косметика');
    expect(scanTriggerSourceLine({ source: 'openproductsfacts' })).toBe('Сканер · бытовая химия');
    expect(scanTriggerSourceLine({})).toBe('Сканер');
  });
});
