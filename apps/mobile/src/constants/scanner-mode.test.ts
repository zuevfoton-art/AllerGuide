import { describe, expect, it } from 'vitest';
import {
  SCANNER_MODES,
  shouldClearScannerResultOnModeChange,
  shouldShowScannerPageTrustLine,
} from './scanner-mode';

describe('scanner mode helpers', () => {
  it('lists the four visible modes', () => {
    expect(SCANNER_MODES).toEqual(['product', 'menu', 'medicine', 'cosmetics']);
  });

  it('hides the page trust line when a result is on screen', () => {
    expect(shouldShowScannerPageTrustLine(false)).toBe(true);
    expect(shouldShowScannerPageTrustLine(true)).toBe(false);
  });

  it('clears the previous verdict only when the mode actually changes', () => {
    expect(shouldClearScannerResultOnModeChange('product', 'menu')).toBe(true);
    expect(shouldClearScannerResultOnModeChange('product', 'product')).toBe(false);
  });
});
