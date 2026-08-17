import { describe, expect, it } from 'vitest';
import { buildCombinedScanText, resolveScanEvidenceKind } from './scan-evidence';

describe('buildCombinedScanText', () => {
  it('keeps OCR text first and appends unique VL ingredients', () => {
    const combined = buildCombinedScanText({
      ocrText: 'Состав: молоко, сахар',
      visionIngredients: ['яйцо', 'майонез'],
      dishName: 'Оливье',
    });

    expect(combined.startsWith('Состав: молоко, сахар')).toBe(true);
    expect(combined).toContain('яйцо');
    expect(combined).toContain('майонез');
    expect(combined).toContain('Оливье');
  });

  it('deduplicates VL ingredients already present in OCR, ignoring case', () => {
    const combined = buildCombinedScanText({
      ocrText: 'Молоко, Пшеничная мука, сахар',
      visionIngredients: ['молоко', 'ПШЕНИЧНАЯ МУКА', 'яйцо'],
      dishName: 'Пирог',
    });

    expect(combined.match(/молоко/gi)?.length).toBe(1);
    expect(combined.match(/пшеничная мука/gi)?.length).toBe(1);
    expect(combined).toContain('яйцо');
    expect(combined).toContain('Пирог');
  });

  it('returns only VL extras when OCR is empty', () => {
    expect(
      buildCombinedScanText({
        ocrText: '   ',
        visionIngredients: ['картофель', 'яйцо'],
        dishName: 'Оливье',
      }),
    ).toBe('Оливье, картофель, яйцо');
  });

  it('returns OCR unchanged when VL adds nothing new', () => {
    const ocr = 'молоко, яйцо';
    expect(
      buildCombinedScanText({
        ocrText: ocr,
        visionIngredients: ['Молоко', 'Яйцо'],
        dishName: 'молоко',
      }),
    ).toBe(ocr);
  });
});

describe('resolveScanEvidenceKind', () => {
  it('returns vl_ocr when both vision and readable OCR are present', () => {
    expect(resolveScanEvidenceKind({ hasVision: true, hasReadableOcr: true })).toBe('vl_ocr');
  });

  it('returns vl when only vision is present', () => {
    expect(resolveScanEvidenceKind({ hasVision: true, hasReadableOcr: false })).toBe('vl');
  });

  it('returns ocr when vision is missing', () => {
    expect(resolveScanEvidenceKind({ hasVision: false, hasReadableOcr: true })).toBe('ocr');
    expect(resolveScanEvidenceKind({ hasVision: false, hasReadableOcr: false })).toBe('ocr');
  });
});
