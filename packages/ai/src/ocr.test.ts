import { describe, expect, it } from 'vitest';
import {
  extractIngredientsBlock,
  getDemoOcrText,
  normalizeOcrText,
  prepareScanTextFromOcr,
  simulateOcrFromCapture,
} from './ocr';

describe('ocr', () => {
  it('normalizes whitespace', () => {
    expect(normalizeOcrText('  молоко,   сахар \n\n яйца ')).toBe('молоко, сахар\n\nяйца');
  });

  it('extracts ingredients block from label text', () => {
    const block = extractIngredientsBlock('Состав: вода, сахар, молоко, арахис');
    expect(block).toContain('вода');
    expect(block).toContain('арахис');
  });

  it('prepares scan text for medicine mode', () => {
    const result = prepareScanTextFromOcr(
      'Действующее вещество: ибупрофен. Вспомогательные: лактоза.',
      'medicine',
    );
    expect(result.text.toLowerCase()).toContain('ибупрофен');
    expect(result.source).toBe('normalized');
  });

  it('simulates demo OCR when no manual text', () => {
    const result = simulateOcrFromCapture('menu');
    expect(result.text).toBeTruthy();
    expect(result.source).toBe('demo');
    expect(result.warnings.some((w) => w.includes('Демо'))).toBe(true);
  });

  it('uses manual text when provided', () => {
    const manual = 'Салат с орехами и сыром';
    const result = simulateOcrFromCapture('menu', manual);
    expect(result.text).toBe(manual);
    expect(result.source).toBe('manual');
  });

  it('provides demo samples per mode', () => {
    expect(getDemoOcrText('cosmetics')).toContain('Aqua');
    expect(getDemoOcrText('medicine')).toContain('ибупрофен');
  });
});
