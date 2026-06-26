import type { CatalogProduct } from '@allerguide/core';
import type { AppTheme } from '@/src/hooks/use-theme';

export function getProductColor(theme: AppTheme, key: CatalogProduct['colorKey']): string {
  const map = {
    purple: theme.colors.purple,
    pink: theme.colors.pink,
    accent: theme.colors.accent,
    success: theme.colors.success,
    warning: theme.colors.warning,
  };
  return map[key];
}
