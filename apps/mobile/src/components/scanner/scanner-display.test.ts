import { describe, expect, it } from 'vitest';
import { scanSourceLabelKey } from './scanner-display';

describe('scanSourceLabelKey', () => {
  it('maps known sources to scanner.* keys', () => {
    expect(scanSourceLabelKey('openfoodfacts')).toBe('scanner.sourceOpenFoodFacts');
    expect(scanSourceLabelKey('llm')).toBe('scanner.sourceLlm');
    expect(scanSourceLabelKey('dish_vision')).toBe('scanner.sourceDishVision');
    expect(scanSourceLabelKey('barcode')).toBe('scanner.sourceBarcode');
  });

  it('falls back to manual for unknown or missing source', () => {
    expect(scanSourceLabelKey(undefined)).toBe('scanner.sourceManual');
    expect(scanSourceLabelKey('keyword' as never)).toBe('scanner.sourceManual');
  });
});
