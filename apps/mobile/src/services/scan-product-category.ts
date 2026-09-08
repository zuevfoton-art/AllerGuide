import type { ScanMode } from '@allerguide/ai';

/** Map an OFF / catalog product category onto the scanner analysis mode. */
export function scanModeFromProductCategory(category?: string | null): ScanMode {
  if (category === 'beauty' || category === 'household') return 'cosmetics';
  if (category === 'medicine') return 'medicine';
  return 'product';
}
