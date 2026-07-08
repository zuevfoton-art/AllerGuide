import type { CatalogProduct } from '@allerguide/core';
import type { AppTheme } from '@/src/hooks/use-theme';

export function getProductColor(theme: AppTheme, key: CatalogProduct['colorKey']): string {
  const map = {
    purple: theme.colors.accent,
    pink: theme.colors.head,
    accent: theme.colors.accent,
    success: theme.colors.success,
    warning: theme.colors.warning,
  };
  return map[key];
}
